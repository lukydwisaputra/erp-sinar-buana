import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { withUserTransaction, withServiceRole, type Tx } from "@/lib/db/tx";
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

/** Best-effort per-service pricing for the itemized invoice table — traced
 * from the source SPH's quotation_items (same serviceId) via the project's
 * quotationId. Empty map when the project has no source SPH (manually
 * created) or the item was removed from the SPH since. If a quotation has
 * more than one line for the same service, the first one wins — same
 * "good enough, not authoritative" spirit as the rest of this snapshot. */
async function loadPricingByServiceId(
  tx: Tx,
  quotationId: string | null,
): Promise<Map<string, { harga: number; volume: number; satuan: string }>> {
  if (!quotationId) return new Map();
  const rows = await tx
    .select({
      serviceId: schema.quotationItems.serviceId,
      unitPrice: schema.quotationItems.unitPrice,
      quantity: schema.quotationItems.quantity,
      unit: schema.quotationItems.unit,
    })
    .from(schema.quotationItems)
    .where(eq(schema.quotationItems.quotationId, quotationId));
  const map = new Map<string, { harga: number; volume: number; satuan: string }>();
  for (const r of rows) {
    if (!r.serviceId || map.has(r.serviceId)) continue;
    map.set(r.serviceId, { harga: Number(r.unitPrice), volume: Number(r.quantity), satuan: r.unit ?? "" });
  }
  return map;
}

async function assembleInstallments(tx: Tx, masterInvoiceId: string, indukNumber: string | null): Promise<InvoiceTermin[]> {
  // Ordered by the linked term's own sortOrder — the authoritative sequence
  // generateNextTermin always follows — rather than createdAt: installments
  // inserted within the same transaction/tick (e.g. bulk-seeded demo data)
  // can share an identical createdAt, which made ORDER BY created_at
  // non-deterministic and could silently swap which row renders as
  // "Termin I"/"T1" vs "Termin II"/"T2" (and therefore which gets deducted
  // from which). createdAt/id remain as a tiebreaker for installments with
  // no term link (termId set null on term delete).
  const joined = await tx
    .select({ installment: schema.installmentInvoices, termSortOrder: schema.masterInvoiceTerms.sortOrder })
    .from(schema.installmentInvoices)
    .leftJoin(schema.masterInvoiceTerms, eq(schema.installmentInvoices.termId, schema.masterInvoiceTerms.id))
    .where(and(eq(schema.installmentInvoices.masterInvoiceId, masterInvoiceId), isNull(schema.installmentInvoices.deletedAt)))
    .orderBy(
      sql`coalesce(${schema.masterInvoiceTerms.sortOrder}, 999999)`,
      asc(schema.installmentInvoices.createdAt),
      asc(schema.installmentInvoices.id),
    );
  const rows = joined.map((r) => r.installment);

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
    indukNumber,
    terminIndex: i,
  }));
}

async function assembleFakturInduk(tx: Tx, masterInvoice: MasterInvoiceRow): Promise<FakturInduk> {
  const [services, terms, project, companyName, status, termins] = await Promise.all([
    tx.select().from(schema.masterInvoiceServices).where(eq(schema.masterInvoiceServices.masterInvoiceId, masterInvoice.id)),
    tx.select().from(schema.masterInvoiceTerms).where(eq(schema.masterInvoiceTerms.masterInvoiceId, masterInvoice.id)),
    tx.select({ name: schema.projects.name, number: schema.projects.number, quotationId: schema.projects.quotationId }).from(schema.projects).where(eq(schema.projects.id, masterInvoice.projectId)).limit(1).then((r) => r[0]),
    loadCompanyName(tx, masterInvoice.companyId),
    loadStatus(tx, masterInvoice.statusId),
    assembleInstallments(tx, masterInvoice.id, masterInvoice.number),
  ]);
  const serviceNamesById = await loadServiceNames(tx, services.map((s) => s.serviceId).filter((x): x is string => !!x));
  const pricingByServiceId = await loadPricingByServiceId(tx, project?.quotationId ?? null);
  const sphNumber = project?.quotationId
    ? await tx.select({ number: schema.quotations.number }).from(schema.quotations).where(eq(schema.quotations.id, project.quotationId)).limit(1).then((r) => r[0]?.number ?? null)
    : null;
  const signatureImage = masterInvoice.signatureTemplateId
    ? await tx.select({ signatureImage: schema.signatureTemplates.signatureImage }).from(schema.signatureTemplates).where(eq(schema.signatureTemplates.id, masterInvoice.signatureTemplateId)).limit(1).then((r) => r[0]?.signatureImage ?? null)
    : null;

  return toFakturInduk({
    masterInvoice,
    proyekNama: project?.name ?? "",
    proyekNumber: project?.number ?? null,
    sphNumber,
    companyName,
    statusLabel: status?.label ?? null,
    statusSystemRole: status?.systemRole ?? null,
    services,
    serviceNamesById,
    pricingByServiceId,
    signatureImage,
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

/** Used only by the internal PDF-render pipeline (`src/app/print/**`, called
 * by the worker via headless browser, not a real user session) — elevated
 * since there's no logged-in user to scope RLS to. Takes the *termin's* id
 * (what document_deliveries actually records) and resolves its parent Induk
 * to assemble both, matching exactly what FakturDocument needs. */
export async function getFakturDocumentForPrint(installmentInvoiceId: string): Promise<{ induk: FakturInduk; termin: InvoiceTermin } | null> {
  return withServiceRole(async (tx) => {
    const [installment] = await tx
      .select({ masterInvoiceId: schema.installmentInvoices.masterInvoiceId })
      .from(schema.installmentInvoices)
      .where(eq(schema.installmentInvoices.id, installmentInvoiceId))
      .limit(1);
    if (!installment) return null;
    const [masterRow] = await tx.select().from(schema.masterInvoices).where(eq(schema.masterInvoices.id, installment.masterInvoiceId)).limit(1);
    if (!masterRow) return null;
    const induk = await assembleFakturInduk(tx, masterRow);
    const termin = induk.termins.find((t) => t.id === installmentInvoiceId);
    if (!termin) return null;
    return { induk, termin };
  });
}

/** Core create logic, usable either standalone (createFakturInduk) or nested
 * inside another function's transaction — e.g. Penawaran's Deal-transition
 * cascade (createProyekAndFakturForDeal in penawaran/service.ts). */
export async function createFakturIndukTx(tx: Tx, userId: string, input: CreateFakturIndukInput): Promise<FakturInduk> {
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
      useDigitalSignature: input.useDigitalSignature,
      signatureTemplateId: input.signatureTemplateId,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  if (input.serviceIds.length) {
    await tx.insert(schema.masterInvoiceServices).values(input.serviceIds.map((serviceId) => ({ masterInvoiceId: masterInvoice.id, serviceId })));
  }
  await tx.insert(schema.masterInvoiceTerms).values(
    input.terminScheme.map((t, i) => ({ masterInvoiceId: masterInvoice.id, label: t.label, percentage: String(t.persen), pemicu: t.pemicu, sortOrder: i })),
  );

  return assembleFakturInduk(tx, masterInvoice);
}

export async function createFakturInduk(userId: string, input: CreateFakturIndukInput): Promise<FakturInduk> {
  return withUserTransaction(userId, (tx) => createFakturIndukTx(tx, userId, input));
}

/** Pushes an edited SPH's services/total/termin-scheme into every Faktur
 * Induk born from its Proyek — Faktur no longer has its own edit UI (Pembatalan
 * Penawaran client request: editing a Deal SPH now auto-syncs Faktur instead of
 * requiring a separate manual edit). No status guard — per the same request,
 * nothing is read-only because of status anymore, so this runs regardless of
 * whether the induk (or SPH/Proyek) is already LUNAS/BATAL.
 *
 * Term scheme is reconciled POSITIONALLY (update-in-place by index, not
 * delete+reinsert) so already-generated installment_invoices keep their
 * `termId` link intact — full replace would null out that FK (onDelete: set
 * null) and confuse generateNextTermin's "which terms are already used" check.
 * Extra trailing terms are inserted/deleted as needed when the counts differ. */
export async function syncFakturIndukFromSph(
  tx: Tx,
  userId: string,
  quotationId: string,
  sph: { serviceIds: string[]; totalBiaya: number; terminScheme: { label: string; persen: number; pemicu: string | null }[] },
): Promise<void> {
  const projectRows = await tx.select({ id: schema.projects.id }).from(schema.projects).where(eq(schema.projects.quotationId, quotationId));
  if (!projectRows.length) return;

  for (const project of projectRows) {
    const induks = await tx
      .select({ id: schema.masterInvoices.id })
      .from(schema.masterInvoices)
      .where(and(eq(schema.masterInvoices.projectId, project.id), isNull(schema.masterInvoices.deletedAt)));

    for (const induk of induks) {
      await tx
        .update(schema.masterInvoices)
        .set({ totalCost: String(sph.totalBiaya), updatedBy: userId })
        .where(eq(schema.masterInvoices.id, induk.id));

      await tx.delete(schema.masterInvoiceServices).where(eq(schema.masterInvoiceServices.masterInvoiceId, induk.id));
      if (sph.serviceIds.length) {
        await tx.insert(schema.masterInvoiceServices).values(sph.serviceIds.map((serviceId) => ({ masterInvoiceId: induk.id, serviceId })));
      }

      const existingTerms = await tx
        .select()
        .from(schema.masterInvoiceTerms)
        .where(eq(schema.masterInvoiceTerms.masterInvoiceId, induk.id))
        .orderBy(asc(schema.masterInvoiceTerms.sortOrder));

      const count = Math.max(existingTerms.length, sph.terminScheme.length);
      for (let i = 0; i < count; i++) {
        const newTerm = sph.terminScheme[i];
        const oldTerm = existingTerms[i];
        if (newTerm && oldTerm) {
          await tx
            .update(schema.masterInvoiceTerms)
            .set({ label: newTerm.label, percentage: String(newTerm.persen), pemicu: newTerm.pemicu, updatedAt: new Date() })
            .where(eq(schema.masterInvoiceTerms.id, oldTerm.id));
        } else if (newTerm && !oldTerm) {
          await tx.insert(schema.masterInvoiceTerms).values({
            masterInvoiceId: induk.id, label: newTerm.label, percentage: String(newTerm.persen), pemicu: newTerm.pemicu, sortOrder: i,
          });
        } else if (!newTerm && oldTerm) {
          await tx.delete(schema.masterInvoiceTerms).where(eq(schema.masterInvoiceTerms.id, oldTerm.id));
        }
      }
    }
  }
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
          pemicu: nextTerm.pemicu,
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

/** Sum of this induk's paid (Lunas) termins, at their after-tax value — "biaya
 * invoice" in the Pembatalan Penawaran spec: the money actually already in
 * hand from this Faktur, compared against the cancellation admin fee. Also
 * returns the most-recently-paid installment, for the shortfall invoice's
 * "sudah dikurangi dari ..." reference link. */
export async function computeSudahDibayar(tx: Tx, masterInvoiceId: string): Promise<{ sudahDibayar: number; lastPaid: InstallmentInvoiceRow | null }> {
  const rows = await tx
    .select({ installment: schema.installmentInvoices, systemRole: schema.workflowStatuses.systemRole })
    .from(schema.installmentInvoices)
    .leftJoin(schema.workflowStatuses, eq(schema.installmentInvoices.statusId, schema.workflowStatuses.id))
    .where(and(eq(schema.installmentInvoices.masterInvoiceId, masterInvoiceId), isNull(schema.installmentInvoices.deletedAt)))
    .orderBy(asc(schema.installmentInvoices.createdAt));
  const paid = rows.filter((r) => r.systemRole === "LUNAS").map((r) => r.installment);
  const sudahDibayar = paid.reduce((sum, r) => sum + Number(r.totalAfterTax), 0);
  return { sudahDibayar, lastPaid: paid.length ? paid[paid.length - 1] : null };
}

/** Generates the one-off "Biaya Administrasi Pengembalian" invoice for the
 * cancellation-fee shortfall (fee > sudahDibayar) — Pembatalan Penawaran
 * client request. termId is null (not part of the original term scheme); no
 * PPN/PPh (it's a penalty charge, not taxed service revenue); its Lunas
 * automation is special-cased by fn_installment_after_change (ADMIN_PEMBATALAN
 * category, no LUNAS roll-up) via the isCancellationFee flag. */
export async function generateCancellationFeeTermin(userId: string, masterInvoiceId: string): Promise<FakturInduk> {
  return withUserTransaction(userId, async (tx) => {
    const [masterInvoice] = await tx.select().from(schema.masterInvoices).where(and(eq(schema.masterInvoices.id, masterInvoiceId), isNull(schema.masterInvoices.deletedAt))).limit(1);
    if (!masterInvoice) throw new NotFoundError("Faktur Induk tidak ditemukan.");

    const [existing] = await tx.select({ id: schema.installmentInvoices.id }).from(schema.installmentInvoices)
      .where(and(eq(schema.installmentInvoices.masterInvoiceId, masterInvoiceId), eq(schema.installmentInvoices.isCancellationFee, true), isNull(schema.installmentInvoices.deletedAt)))
      .limit(1);
    if (existing) throw new ConflictError("Invoice Biaya Administrasi Pengembalian sudah pernah dibuat.");

    const fee = Number(masterInvoice.cancelFee ?? 0);
    const { sudahDibayar, lastPaid } = await computeSudahDibayar(tx, masterInvoiceId);
    const shortfall = fee - sudahDibayar;
    if (shortfall <= 0) throw new ConflictError("Tidak ada selisih biaya administrasi yang perlu ditagih.");

    const statusId = await getDefaultStatusId(tx, "faktur");
    const today = todayISO();
    await tx.insert(schema.installmentInvoices).values({
      masterInvoiceId,
      termId: null,
      label: "Biaya Administrasi Pengembalian",
      pemicu: null,
      isCancellationFee: true,
      referencedInstallmentId: lastPaid?.id ?? null,
      date: today,
      dueDate: addDays(today, DEFAULT_INVOICE_DUE_DAYS),
      statusId,
      currentTermValue: String(shortfall),
      dpp: "0",
      ppn: "0",
      pph23: "0",
      totalAfterTax: String(shortfall),
      grossIncome: String(shortfall),
      netIncome: String(shortfall),
      notes: lastPaid ? `Sudah dikurangi dari ${lastPaid.label} yang sudah dibayarkan.` : null,
      createdBy: userId,
      updatedBy: userId,
    });

    return assembleFakturInduk(tx, masterInvoice);
  });
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
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
