/**
 * Pure DB-row <-> app-shape mapping for Faktur (Faktur Induk / Invoice
 * Termin), kept free of any DB connection import so these functions stay
 * unit-testable without a live Postgres — see `src/lib/faktur/service.ts` for
 * the actual queries.
 */
import type {
  masterInvoices,
  masterInvoiceServices,
  masterInvoiceTerms,
  installmentInvoices,
} from "@/lib/db/schema";
import type { FakturInduk, InvoiceTermin } from "@/lib/schemas/faktur";

export type MasterInvoiceRow = typeof masterInvoices.$inferSelect;
export type MasterInvoiceServiceRow = typeof masterInvoiceServices.$inferSelect;
export type MasterInvoiceTermRow = typeof masterInvoiceTerms.$inferSelect;
export type InstallmentInvoiceRow = typeof installmentInvoices.$inferSelect;

function sortByOrder<T extends { sortOrder: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.sortOrder - b.sortOrder);
}

export type ToInvoiceTerminInput = {
  installment: InstallmentInvoiceRow;
  statusLabel: string | null;
  statusSystemRole: string | null;
  bankAccount: { bankName: string; accountHolder: string; accountNumber: string } | null;
  /** Earlier sibling installments of the same master invoice, ordered by
   * creation — the previous-term deduction list is always recomputed for
   * display, never stored (matches the DB's own design comment). */
  previousInstallments: InstallmentInvoiceRow[];
  /** Parent Faktur Induk's own number (e.g. "INV/001/04.2026") — a termin has
   * no numbering identity of its own; its displayed number is derived as
   * "{indukNumber}-T{terminIndex}", never independently trigger-assigned. */
  indukNumber: string | null;
  /** 0-based position among this induk's termins, ordered by creation (T1, T2, ...). */
  terminIndex: number;
};

function resolveReferencedInstallment(
  input: ToInvoiceTerminInput,
): { id: string; label: string; number: string | null } | null {
  const r = input.installment;
  if (!r.referencedInstallmentId) return null;
  const idx = input.previousInstallments.findIndex((p) => p.id === r.referencedInstallmentId);
  if (idx === -1) return null;
  const referenced = input.previousInstallments[idx];
  return {
    id: referenced.id,
    label: referenced.label,
    number: input.indukNumber ? `${input.indukNumber}-T${idx + 1}` : null,
  };
}

export function toInvoiceTermin(input: ToInvoiceTerminInput): InvoiceTermin {
  const r = input.installment;
  return {
    id: r.id,
    number: input.indukNumber ? `${input.indukNumber}-T${input.terminIndex + 1}` : null,
    masterInvoiceId: r.masterInvoiceId,
    termId: r.termId,
    label: r.label,
    tanggal: r.date,
    jatuhTempo: r.dueDate,
    bankAccountId: r.bankAccountId,
    bankNama: input.bankAccount?.bankName ?? "",
    bankAtasNama: input.bankAccount?.accountHolder ?? "",
    bankNoRekening: input.bankAccount?.accountNumber ?? "",
    statusId: r.statusId,
    status: input.statusLabel ?? "—",
    statusSystemRole: input.statusSystemRole,
    paidDate: r.paidDate,
    nilaiTermin: Number(r.currentTermValue),
    dpp: Number(r.dpp),
    ppn: Number(r.ppn),
    pph23: Number(r.pph23),
    totalSetelahPajak: Number(r.totalAfterTax),
    grossIncome: Number(r.grossIncome),
    netIncome: Number(r.netIncome),
    // Deducted at the pre-tax value (currentTermValue) — TOTAL BIAYA on the
    // invoice is the pre-tax contract total, so the running deduction must
    // stay in the same (pre-tax) unit, not the after-tax total.
    previousTermins: input.previousInstallments.map((p) => ({
      label: p.label,
      nilai: Number(p.currentTermValue),
      pemicu: p.pemicu ?? null,
    })),
    pemicu: r.pemicu ?? null,
    catatan: r.notes ?? "",
    isCancellationFee: r.isCancellationFee,
    referencedInstallment: resolveReferencedInstallment(input),
  };
}

export type ToFakturIndukInput = {
  masterInvoice: MasterInvoiceRow;
  proyekNama: string;
  proyekNumber: string | null;
  sphNumber: string | null;
  companyName: string;
  statusLabel: string | null;
  statusSystemRole: string | null;
  services: MasterInvoiceServiceRow[];
  serviceNamesById: Map<string, string>;
  /** Best-effort pricing per billed service, traced from the source SPH's
   * quotation_items (see faktur/service.ts) — empty map when the project has
   * no source SPH, in which case every line just shows the service name. */
  pricingByServiceId: Map<string, { harga: number; volume: number; satuan: string }>;
  terms: MasterInvoiceTermRow[];
  termins: InvoiceTermin[];
  /** Resolved from masterInvoice.signatureTemplateId — null when not using a
   * digital signature, or the linked template was deleted (FK set null). */
  signatureImage: string | null;
};

/** Flat termin-level row for Dasbor's revenue/forecast/alert calculations —
 * these were built around the mock's flat one-row-per-termin `Faktur` shape,
 * so this adapter keeps them from having to walk the real Induk→Termin
 * hierarchy themselves. Pure, no DB access. */
export type FakturTerminRow = {
  id: string;
  /** Faktur Induk (master invoice) id — the /faktur/[id] route target, distinct from `id` (the termin itself). */
  indukId: string;
  /** Displayed number, e.g. "INV/001/2026-T1" — null only if the Induk itself has no number yet. */
  number: string | null;
  proyekId: string;
  perusahaanNama: string;
  tanggal: string;
  jatuhTempo: string | null;
  statusSystemRole: string | null; // null = "Belum Lunas", "LUNAS", or "BATAL"
  nilaiTermin: number;
  pph23: number;
  netIncome: number;
  totalSetelahPajak: number;
};

export function flattenTermins(induks: FakturInduk[]): FakturTerminRow[] {
  return induks.flatMap((f) => f.termins.map((t) => ({
    id: t.id,
    indukId: f.id,
    number: t.number,
    proyekId: f.proyekId,
    perusahaanNama: f.perusahaanNama,
    tanggal: t.tanggal,
    jatuhTempo: t.jatuhTempo,
    statusSystemRole: t.statusSystemRole,
    nilaiTermin: t.nilaiTermin,
    pph23: t.pph23,
    netIncome: t.netIncome,
    totalSetelahPajak: t.totalSetelahPajak,
  })));
}

export function toFakturInduk(input: ToFakturIndukInput): FakturInduk {
  const m = input.masterInvoice;
  return {
    id: m.id,
    number: m.number,
    proyekId: m.projectId,
    proyekNama: input.proyekNama,
    proyekNumber: input.proyekNumber,
    sphNumber: input.sphNumber,
    perusahaanId: m.companyId,
    perusahaanNama: input.companyName,
    layanan: input.services.map((s) => {
      const pricing = s.serviceId ? input.pricingByServiceId.get(s.serviceId) : undefined;
      return {
        serviceId: s.serviceId,
        nama: (s.serviceId && input.serviceNamesById.get(s.serviceId)) || s.description || "—",
        harga: pricing?.harga ?? null,
        volume: pricing?.volume ?? null,
        satuan: pricing?.satuan ?? null,
      };
    }),
    totalBiaya: Number(m.totalCost),
    statusId: m.statusId,
    status: input.statusLabel ?? "—",
    statusSystemRole: input.statusSystemRole,
    notes: m.notes ?? "",
    terminScheme: sortByOrder(input.terms).map((t) => ({ label: t.label, persen: Number(t.percentage), pemicu: t.pemicu ?? null })),
    termins: input.termins,
    createdAt: m.createdAt.toISOString(),
    useDigitalSignature: m.useDigitalSignature,
    signatureTemplateId: m.signatureTemplateId,
    signatureImage: input.signatureImage,
    cancelReason: m.cancelReason,
    cancelFee: m.cancelFee !== null ? Number(m.cancelFee) : null,
  };
}
