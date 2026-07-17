import { and, eq, isNull } from "drizzle-orm";
import { withUserTransaction, type Tx } from "@/lib/db/tx";
import { schema } from "@/lib/db/client";
import { NotFoundError } from "@/lib/api-error";
import { computeSudahDibayar } from "@/lib/faktur/service";
import type { CancelPembatalanInput } from "@/lib/schemas/pembatalan";

/** Direct workflow_statuses(entity, systemRole) lookup — bypasses the shared
 * WorkflowStatusEntity helper (deliberately excludes "penawaran", see
 * workflow-status.ts) since Pembatalan needs BATAL for all 3 entities alike. */
async function getBatalStatusId(tx: Tx, entity: "penawaran" | "proyek" | "faktur"): Promise<string> {
  const [row] = await tx
    .select({ id: schema.workflowStatuses.id })
    .from(schema.workflowStatuses)
    .where(and(eq(schema.workflowStatuses.entity, entity), eq(schema.workflowStatuses.systemRole, "BATAL")))
    .limit(1);
  if (!row) throw new NotFoundError(`Status Batal untuk "${entity}" belum tersedia — jalankan seed data.`);
  return row.id;
}

async function getCategoryId(tx: Tx, systemKey: "REFUND_PEMBATALAN" | "ADMIN_PEMBATALAN"): Promise<string | null> {
  const [row] = await tx
    .select({ id: schema.cashflowCategories.id })
    .from(schema.cashflowCategories)
    .where(eq(schema.cashflowCategories.systemKey, systemKey))
    .limit(1);
  return row?.id ?? null;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

type Resolved = { sphId: string | null; proyekId: string | null; fakturIndukIds: string[] };

async function resolveLinkedEntities(tx: Tx, input: CancelPembatalanInput): Promise<Resolved> {
  if (input.fakturIndukId) {
    const [induk] = await tx.select({ projectId: schema.masterInvoices.projectId }).from(schema.masterInvoices).where(eq(schema.masterInvoices.id, input.fakturIndukId)).limit(1);
    if (!induk) throw new NotFoundError("Faktur Induk tidak ditemukan.");
    return resolveFromProyekId(tx, induk.projectId);
  }
  if (input.proyekId) {
    return resolveFromProyekId(tx, input.proyekId);
  }
  if (input.sphId) {
    const [project] = await tx.select({ id: schema.projects.id }).from(schema.projects).where(and(eq(schema.projects.quotationId, input.sphId), isNull(schema.projects.deletedAt))).limit(1);
    if (!project) return { sphId: input.sphId, proyekId: null, fakturIndukIds: [] };
    return resolveFromProyekId(tx, project.id, input.sphId);
  }
  throw new NotFoundError("Tidak ada SPH/Proyek/Faktur yang ditentukan untuk dibatalkan.");
}

async function resolveFromProyekId(tx: Tx, proyekId: string, knownSphId?: string): Promise<Resolved> {
  const [project] = await tx.select({ id: schema.projects.id, quotationId: schema.projects.quotationId }).from(schema.projects).where(eq(schema.projects.id, proyekId)).limit(1);
  if (!project) throw new NotFoundError("Proyek tidak ditemukan.");
  const induks = await tx.select({ id: schema.masterInvoices.id }).from(schema.masterInvoices).where(and(eq(schema.masterInvoices.projectId, proyekId), isNull(schema.masterInvoices.deletedAt)));
  return { sphId: knownSphId ?? project.quotationId, proyekId, fakturIndukIds: induks.map((i) => i.id) };
}

/** Cancels whichever of SPH/Proyek/Faktur Induk is linked to the given
 * trigger id, all together (Pembatalan Penawaran client request) — cancelling
 * any one cascades to the other two. Idempotent per Faktur Induk: the direct
 * refund/fee cashflow booking only runs the first time an induk transitions
 * into BATAL, never on a repeat call. Nothing is locked/read-only by status
 * elsewhere in the app anymore, so this can be re-triggered (e.g. to update
 * alasan/biayaAdministrasi) without side effects beyond the status write. */
export async function cancelPembatalan(userId: string, input: CancelPembatalanInput): Promise<void> {
  return withUserTransaction(userId, async (tx) => {
    const { sphId, proyekId, fakturIndukIds } = await resolveLinkedEntities(tx, input);
    const fee = input.biayaAdministrasi ?? null;

    if (sphId) {
      const batalId = await getBatalStatusId(tx, "penawaran");
      await tx.update(schema.quotations).set({ statusId: batalId, cancelReason: input.alasan, cancelFee: fee !== null ? String(fee) : null, updatedBy: userId }).where(eq(schema.quotations.id, sphId));
    }

    if (proyekId) {
      const batalId = await getBatalStatusId(tx, "proyek");
      await tx.update(schema.projects).set({ statusId: batalId, cancelReason: input.alasan, cancelFee: fee !== null ? String(fee) : null, updatedBy: userId }).where(eq(schema.projects.id, proyekId));
    }

    const batalFakturId = fakturIndukIds.length ? await getBatalStatusId(tx, "faktur") : null;
    for (const indukId of fakturIndukIds) {
      const [induk] = await tx.select({ statusId: schema.masterInvoices.statusId, number: schema.masterInvoices.number }).from(schema.masterInvoices).where(eq(schema.masterInvoices.id, indukId)).limit(1);
      if (!induk) continue;
      const [prevStatus] = induk.statusId
        ? await tx.select({ systemRole: schema.workflowStatuses.systemRole }).from(schema.workflowStatuses).where(eq(schema.workflowStatuses.id, induk.statusId)).limit(1)
        : [null];
      const alreadyBatal = prevStatus?.systemRole === "BATAL";

      await tx.update(schema.masterInvoices).set({ statusId: batalFakturId, cancelReason: input.alasan, cancelFee: fee !== null ? String(fee) : null, updatedBy: userId }).where(eq(schema.masterInvoices.id, indukId));

      // Financial adjustment — only the first time this induk actually becomes
      // BATAL, and only when there's real money already collected on it (no
      // Faktur/nothing paid yet = nothing to reconcile, per the client's rule).
      if (alreadyBatal) continue;
      const { sudahDibayar } = await computeSudahDibayar(tx, indukId);
      if (sudahDibayar <= 0) continue;

      const adminFee = fee ?? 0;
      if (adminFee > sudahDibayar) continue; // shortfall — billed later via the "Buat Invoice Biaya Administrasi Pengembalian" button

      const diff = sudahDibayar - adminFee;
      const when = todayISO();
      if (diff > 0.01) {
        const categoryId = await getCategoryId(tx, "REFUND_PEMBATALAN");
        await tx.insert(schema.cashflowEntries).values({
          type: "debit", date: when, amount: String(diff), categoryId, source: "manual",
          description: `Pengembalian pembatalan ${induk.number ?? ""}`.trim(), isLocked: true,
        });
      }
      if (adminFee > 0.01) {
        const categoryId = await getCategoryId(tx, "ADMIN_PEMBATALAN");
        await tx.insert(schema.cashflowEntries).values({
          type: "kredit", date: when, amount: String(adminFee), categoryId, source: "manual",
          description: `Biaya administrasi pembatalan ${induk.number ?? ""}`.trim(), isLocked: true,
        });
      }
    }
  });
}
