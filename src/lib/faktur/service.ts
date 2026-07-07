import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { withUserTransaction, type Tx } from "@/lib/db/tx";
import { schema } from "@/lib/db/client";
import { NotFoundError, ConflictError } from "@/lib/api-error";
import {
  toFakturInduk,
  toInvoiceTermin,
  type MasterInvoiceRow,
  type InstallmentInvoiceRow,
} from "@/lib/faktur/mapping";
import { getDefaultStatusId, loadStatus, loadStatusLabelsByIds } from "@/lib/workflow-status";
import type {
  FakturInduk,
  InvoiceTermin,
  CreateFakturIndukInput,
  GenerateTerminInput,
  UpdateTerminInput,
} from "@/lib/schemas/faktur";

export { toFakturInduk, toInvoiceTermin } from "@/lib/faktur/mapping";

// Invoice due date default (PRD Bab 5.1.B) — tax_settings.invoiceDueDays isn't
// mirrored in this app (only Faktur needs it so far); hardcode its DB default
// (14 days) rather than mirroring a whole settings table for one field.
const DEFAULT_INVOICE_DUE_DAYS = 14;

async function loadCompanyName(tx: Tx, companyId: string): Promise<string> {
  const [row] = await tx.select({ name: schema.companies.name }).from(schema.companies).where(eq(schema.companies.id, companyId)).limit(1);
  return row?.name ?? "";
}

async function loadServiceNames(tx: Tx, serviceIds: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(serviceIds)];
  if (!ids.length) return new Map();
  const rows = await tx.select({ id: schema.serviceCatalog.id, name: schema.serviceCatalog.name }).from(schema.serviceCatalog).where(inArray(schema.serviceCatalog.id, ids));
  return new Map(rows.map((r) => [r.id, r.name]));
}

async function assembleInstallments(tx: Tx, masterInvoiceId: string): Promise<InvoiceTermin[]> {
  const rows = await tx
    .select()
    .from(schema.installmentInvoices)
    .where(and(eq(schema.installmentInvoices.masterInvoiceId, masterInvoiceId), isNull(schema.installmentInvoices.deletedAt)))
    .orderBy(asc(schema.installmentInvoices.createdAt));

  const statusIds = rows.map((r) => r.statusId).filter((x): x is string => !!x);
  const bankAccountIds = [...new Set(rows.map((r) => r.bankAccountId).filter((x): x is string => !!x))];
  const [statusLabelsById, bankAccounts] = await Promise.all([
    loadStatusLabelsByIds(tx, statusIds),
    bankAccountIds.length
      ? tx.select({ id: schema.bankAccounts.id, bankName: schema.bankAccounts.bankName, accountHolder: schema.bankAccounts.accountHolder, accountNumber: schema.bankAccounts.accountNumber }).from(schema.bankAccounts).where(inArray(schema.bankAccounts.id, bankAccountIds))
      : Promise.resolve([]),
  ]);
  const bankById = new Map(bankAccounts.map((b) => [b.id, b]));

  // Need systemRole per installment too (for the badge-color heuristic + Lunas checks) —
  // loadStatusLabelsByIds only returns labels, so fetch systemRole in the same small query set.
  const statusRoleById = new Map<string, string | null>();
  await Promise.all(
    [...new Set(statusIds)].map(async (id) => {
      const status = await loadStatus(tx, id);
      statusRoleById.set(id, status?.systemRole ?? null);
    }),
  );

  return rows.map((r, i) => toInvoiceTermin({
    installment: r,
    statusLabel: (r.statusId && statusLabelsById.get(r.statusId)) ?? null,
    statusSystemRole: r.statusId ? statusRoleById.get(r.statusId) ?? null : null,
    bankAccount: r.bankAccountId ? bankById.get(r.bankAccountId) ?? null : null,
    previousInstallments: rows.slice(0, i),
  }));
}

async function assembleFakturInduk(tx: Tx, masterInvoice: MasterInvoiceRow): Promise<FakturInduk> {
  const [services, terms, project, companyName, status, termins] = await Promise.all([
    tx.select().from(schema.masterInvoiceServices).where(eq(schema.masterInvoiceServices.masterInvoiceId, masterInvoice.id)),
    tx.select().from(schema.masterInvoiceTerms).where(eq(schema.masterInvoiceTerms.masterInvoiceId, masterInvoice.id)),
    tx.select({ name: schema.projects.name }).from(schema.projects).where(eq(schema.projects.id, masterInvoice.projectId)).limit(1).then((r) => r[0]),
    loadCompanyName(tx, masterInvoice.companyId),
    loadStatus(tx, masterInvoice.statusId),
    assembleInstallments(tx, masterInvoice.id),
  ]);
  const serviceNamesById = await loadServiceNames(tx, services.map((s) => s.serviceId).filter((x): x is string => !!x));

  return toFakturInduk({
    masterInvoice,
    proyekNama: project?.name ?? "",
    companyName,
    statusLabel: status?.label ?? null,
    statusSystemRole: status?.systemRole ?? null,
    services,
    serviceNamesById,
    terms,
    termins,
  });
}

export async function listByProyek(userId: string, proyekId: string): Promise<FakturInduk[]> {
  return withUserTransaction(userId, async (tx) => {
    const rows = await tx.select().from(schema.masterInvoices).where(and(eq(schema.masterInvoices.projectId, proyekId), isNull(schema.masterInvoices.deletedAt)));
    return Promise.all(rows.map((row) => assembleFakturInduk(tx, row)));
  });
}

export async function listAll(userId: string): Promise<FakturInduk[]> {
  return withUserTransaction(userId, async (tx) => {
    const rows = await tx.select().from(schema.masterInvoices).where(isNull(schema.masterInvoices.deletedAt));
    return Promise.all(rows.map((row) => assembleFakturInduk(tx, row)));
  });
}

export async function getFakturInduk(userId: string, id: string): Promise<FakturInduk> {
  return withUserTransaction(userId, async (tx) => {
    const [row] = await tx.select().from(schema.masterInvoices).where(and(eq(schema.masterInvoices.id, id), isNull(schema.masterInvoices.deletedAt))).limit(1);
    if (!row) throw new NotFoundError("Faktur Induk tidak ditemukan.");
    return assembleFakturInduk(tx, row);
  });
}

export async function createFakturInduk(userId: string, input: CreateFakturIndukInput): Promise<FakturInduk> {
  return withUserTransaction(userId, async (tx) => {
    const [project] = await tx.select({ id: schema.projects.id, companyId: schema.projects.companyId }).from(schema.projects).where(eq(schema.projects.id, input.proyekId)).limit(1);
    if (!project) throw new NotFoundError("Proyek tidak ditemukan.");
    const statusId = await getDefaultStatusId(tx, "faktur");

    const [masterInvoice] = await tx
      .insert(schema.masterInvoices)
      .values({
        projectId: input.proyekId,
        companyId: project.companyId,
        totalCost: String(input.totalBiaya),
        statusId,
        notes: input.notes || null,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    if (input.serviceIds.length) {
      await tx.insert(schema.masterInvoiceServices).values(input.serviceIds.map((serviceId) => ({ masterInvoiceId: masterInvoice.id, serviceId })));
    }
    await tx.insert(schema.masterInvoiceTerms).values(
      input.terminScheme.map((t, i) => ({ masterInvoiceId: masterInvoice.id, label: t.label, percentage: String(t.persen), sortOrder: i })),
    );

    return assembleFakturInduk(tx, masterInvoice);
  });
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Resolves ppn/pph23 defaults from the project's originating quotation (SPH),
 * which already captured these respecting the company's PKP status at
 * Penawaran-time — falls back to Penawaran's own schema defaults (12%/2%,
 * both active) for manually-created projects with no linked quotation. */
async function resolveTaxDefaults(tx: Tx, projectId: string) {
  const [project] = await tx.select({ quotationId: schema.projects.quotationId }).from(schema.projects).where(eq(schema.projects.id, projectId)).limit(1);
  if (project?.quotationId) {
    const [quotation] = await tx
      .select({ ppnActive: schema.quotations.ppnActive, ppnPercent: schema.quotations.ppnPercent, pph23Active: schema.quotations.pph23Active, pph23Percent: schema.quotations.pph23Percent })
      .from(schema.quotations)
      .where(eq(schema.quotations.id, project.quotationId))
      .limit(1);
    if (quotation) {
      return {
        ppnActive: quotation.ppnActive,
        ppnPercent: quotation.ppnPercent !== null ? Number(quotation.ppnPercent) : 12,
        pph23Active: quotation.pph23Active,
        pph23Percent: quotation.pph23Percent !== null ? Number(quotation.pph23Percent) : 2,
      };
    }
  }
  return { ppnActive: true, ppnPercent: 12, pph23Active: true, pph23Percent: 2 };
}

export async function generateNextTermin(userId: string, masterInvoiceId: string, input: GenerateTerminInput): Promise<FakturInduk> {
  return withUserTransaction(userId, async (tx) => {
    const [masterInvoice] = await tx.select().from(schema.masterInvoices).where(and(eq(schema.masterInvoices.id, masterInvoiceId), isNull(schema.masterInvoices.deletedAt))).limit(1);
    if (!masterInvoice) throw new NotFoundError("Faktur Induk tidak ditemukan.");

    const terms = await tx.select().from(schema.masterInvoiceTerms).where(eq(schema.masterInvoiceTerms.masterInvoiceId, masterInvoiceId)).orderBy(asc(schema.masterInvoiceTerms.sortOrder));
    const existingInstallments = await tx.select({ termId: schema.installmentInvoices.termId }).from(schema.installmentInvoices).where(and(eq(schema.installmentInvoices.masterInvoiceId, masterInvoiceId), isNull(schema.installmentInvoices.deletedAt)));
    const usedTermIds = new Set(existingInstallments.map((i) => i.termId).filter((x): x is string => !!x));
    const nextTerm = terms.find((t) => !usedTermIds.has(t.id));
    if (!nextTerm) throw new ConflictError("Semua termin pada Faktur Induk ini sudah dibuat.");

    const statusId = await getDefaultStatusId(tx, "faktur");
    const nilaiTermin = (Number(nextTerm.percentage) / 100) * Number(masterInvoice.totalCost);
    const dpp = (11 / 12) * nilaiTermin;
    const tax = input.ppnAktif !== undefined || input.pph23Aktif !== undefined
      ? { ppnActive: input.ppnAktif ?? false, ppnPercent: input.ppnPersen ?? 12, pph23Active: input.pph23Aktif ?? false, pph23Percent: input.pph23Persen ?? 2 }
      : await resolveTaxDefaults(tx, masterInvoice.projectId);
    const ppn = tax.ppnActive ? Math.round((tax.ppnPercent / 100) * dpp) : 0;
    const pph23 = tax.pph23Active ? (tax.pph23Percent / 100) * nilaiTermin : 0;
    const totalAfterTax = nilaiTermin + ppn - pph23;

    let installment: InstallmentInvoiceRow;
    try {
      [installment] = await tx
        .insert(schema.installmentInvoices)
        .values({
          masterInvoiceId,
          termId: nextTerm.id,
          label: nextTerm.label,
          date: input.tanggal,
          dueDate: input.jatuhTempo || addDays(input.tanggal, DEFAULT_INVOICE_DUE_DAYS),
          bankAccountId: input.bankAccountId || null,
          statusId,
          currentTermValue: String(nilaiTermin),
          dpp: String(dpp),
          ppn: String(ppn),
          pph23: String(pph23),
          totalAfterTax: String(totalAfterTax),
          grossIncome: String(nilaiTermin),
          netIncome: String(nilaiTermin - pph23),
          notes: input.catatan || null,
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();
    } catch (error) {
      // Surfaces fn_installment_validate's "Total termin melebihi Total Biaya"
      // guard — postgres-js/drizzle wrap the actual PostgresError under
      // `.cause`, so the raised message isn't on the top-level Error.
      const cause = error instanceof Error && error.cause instanceof Error ? error.cause : error;
      if (cause instanceof Error && /Total termin/.test(cause.message)) {
        throw new ConflictError(cause.message);
      }
      throw error;
    }
    void installment;

    return assembleFakturInduk(tx, masterInvoice);
  });
}

/** Pure status/field update — the DB trigger (fn_installment_after_change)
 * handles all Lunas/Batal automation (cashflow + tax entries, master-invoice
 * roll-up) when statusId changes; the app never duplicates that logic. */
export async function updateTermin(userId: string, masterInvoiceId: string, terminId: string, input: UpdateTerminInput): Promise<FakturInduk> {
  return withUserTransaction(userId, async (tx) => {
    const [masterInvoice] = await tx.select().from(schema.masterInvoices).where(eq(schema.masterInvoices.id, masterInvoiceId)).limit(1);
    if (!masterInvoice) throw new NotFoundError("Faktur Induk tidak ditemukan.");
    const [existing] = await tx.select({ id: schema.installmentInvoices.id }).from(schema.installmentInvoices).where(and(eq(schema.installmentInvoices.id, terminId), eq(schema.installmentInvoices.masterInvoiceId, masterInvoiceId))).limit(1);
    if (!existing) throw new NotFoundError("Invoice Termin tidak ditemukan.");

    await tx
      .update(schema.installmentInvoices)
      .set({
        ...(input.statusId !== undefined && { statusId: input.statusId }),
        ...(input.paidDate !== undefined && { paidDate: input.paidDate }),
        ...(input.jatuhTempo !== undefined && { dueDate: input.jatuhTempo }),
        ...(input.bankAccountId !== undefined && { bankAccountId: input.bankAccountId }),
        ...(input.catatan !== undefined && { notes: input.catatan || null }),
        updatedBy: userId,
      })
      .where(eq(schema.installmentInvoices.id, terminId));

    // Re-fetch — the trigger may have rolled the master invoice up to Lunas.
    const [refreshed] = await tx.select().from(schema.masterInvoices).where(eq(schema.masterInvoices.id, masterInvoiceId)).limit(1);
    return assembleFakturInduk(tx, refreshed);
  });
}

/** Cross-module cleanup (mirrors proyek/service.ts's cancelProyekBySph/
 * deleteProyekBySph) — Faktur Induk is proyek-scoped now, not sph-scoped, so
 * this resolves the project born from the SPH first. Called from
 * Penawaran's delete-cascade flow when a cancelled SPH is removed. */
export async function deleteFakturBySph(userId: string, sphId: string): Promise<void> {
  await withUserTransaction(userId, async (tx) => {
    const [project] = await tx.select({ id: schema.projects.id }).from(schema.projects).where(eq(schema.projects.quotationId, sphId)).limit(1);
    if (!project) return;
    const rows = await tx.select({ id: schema.masterInvoices.id }).from(schema.masterInvoices).where(and(eq(schema.masterInvoices.projectId, project.id), isNull(schema.masterInvoices.deletedAt)));
    for (const row of rows) {
      await tx.update(schema.masterInvoices).set({ deletedAt: new Date(), deletedBy: userId }).where(eq(schema.masterInvoices.id, row.id));
    }
  });
}

/** Real sum of unpaid termin totals per company — for Perusahaan's `piutang`
 * metric (ripple fix; previously re-implemented the tax math over a frozen
 * mock fixture array). Takes `tx` directly (not a userId) so callers already
 * inside their own transaction (perusahaan/service.ts) don't open a second
 * one — same pattern as countPenawaranByCompany/countActiveProjectsByCompany. */
export async function sumPiutangByCompanies(tx: Tx, companyIds: string[]): Promise<Map<string, number>> {
  if (!companyIds.length) return new Map();
  const rows = await tx
    .select({ companyId: schema.masterInvoices.companyId, totalAfterTax: schema.installmentInvoices.totalAfterTax, statusId: schema.installmentInvoices.statusId })
    .from(schema.installmentInvoices)
    .innerJoin(schema.masterInvoices, eq(schema.installmentInvoices.masterInvoiceId, schema.masterInvoices.id))
    .where(and(inArray(schema.masterInvoices.companyId, companyIds), isNull(schema.installmentInvoices.deletedAt), isNull(schema.masterInvoices.deletedAt)));

  const statusIds = [...new Set(rows.map((r) => r.statusId).filter((x): x is string => !!x))];
  const roleById = new Map<string, string | null>();
  await Promise.all(statusIds.map(async (id) => {
    const status = await loadStatus(tx, id);
    roleById.set(id, status?.systemRole ?? null);
  }));

  const result = new Map<string, number>();
  for (const r of rows) {
    const role = r.statusId ? roleById.get(r.statusId) ?? null : null;
    if (role === "LUNAS" || role === "BATAL") continue;
    result.set(r.companyId, (result.get(r.companyId) ?? 0) + Number(r.totalAfterTax));
  }
  return result;
}
