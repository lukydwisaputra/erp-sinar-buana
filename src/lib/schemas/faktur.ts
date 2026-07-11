import { z } from "zod";

/** Real, DB-assigned status label (workflow_statuses, entity='faktur': Belum
 * Lunas/Lunas/Batal) — shared between Faktur Induk and each Invoice Termin,
 * same free-dropdown pattern as Penawaran/Proyek. */
export const invoiceTerminSchema = z.object({
  id: z.string(),
  number: z.string().nullable(), // derived from the Induk's number, e.g. "INV/001/2026-T1" — not independently assigned
  masterInvoiceId: z.string(),
  termId: z.string().nullable(),
  label: z.string(),
  tanggal: z.string(),
  jatuhTempo: z.string().nullable(),
  bankAccountId: z.string().nullable(),
  bankNama: z.string(),
  bankAtasNama: z.string(),
  bankNoRekening: z.string(),
  statusId: z.string().nullable(),
  status: z.string(),
  statusSystemRole: z.string().nullable(),
  paidDate: z.string().nullable(),
  nilaiTermin: z.number(),
  dpp: z.number(),
  ppn: z.number(),
  pph23: z.number(),
  totalSetelahPajak: z.number(),
  grossIncome: z.number(),
  netIncome: z.number(),
  // Derived read-side from earlier sibling installments — never stored.
  previousTermins: z.array(z.object({ label: z.string(), nilai: z.number() })),
  catatan: z.string(),
});
export type InvoiceTermin = z.infer<typeof invoiceTerminSchema>;

export const fakturLayananSchema = z.object({
  serviceId: z.string().nullable(),
  nama: z.string(),
});

export const fakturTermSchemeItemSchema = z.object({
  label: z.string(),
  persen: z.coerce.number(),
});
export type FakturTermSchemeItem = z.infer<typeof fakturTermSchemeItemSchema>;

export const fakturIndukSchema = z.object({
  id: z.string(),
  number: z.string().nullable(), // e.g. INV/001/2026 — assigned by trigger, resets yearly
  proyekId: z.string(),
  proyekNama: z.string(),
  perusahaanId: z.string(),
  perusahaanNama: z.string(),
  layanan: z.array(fakturLayananSchema),
  totalBiaya: z.number(),
  statusId: z.string().nullable(),
  status: z.string(),
  statusSystemRole: z.string().nullable(),
  notes: z.string(),
  terminScheme: z.array(fakturTermSchemeItemSchema),
  termins: z.array(invoiceTerminSchema),
  createdAt: z.string(),
});
export type FakturInduk = z.infer<typeof fakturIndukSchema>;

/** Create a Faktur Induk from a Proyek — pick which of the project's services
 * this induk bills (a project may have several Faktur Induk over different
 * service subsets) plus the proposed term scheme. */
export const createFakturIndukSchema = z.object({
  proyekId: z.string().min(1, "Proyek wajib dipilih."),
  serviceIds: z.array(z.string()).default([]),
  totalBiaya: z.coerce.number().positive("Total biaya harus > 0."),
  notes: z.string().optional(),
  terminScheme: z.array(fakturTermSchemeItemSchema).min(1, "Skema termin tidak boleh kosong."),
});
export type CreateFakturIndukInput = z.infer<typeof createFakturIndukSchema>;

/** Edit an existing Faktur Induk — same billable-service/total-biaya/catatan
 * fields as create, minus `proyekId` (fixed at creation) and `terminScheme`
 * (immutable once set — termins are already generated against it). */
export const updateFakturIndukSchema = z.object({
  serviceIds: z.array(z.string()).default([]),
  totalBiaya: z.coerce.number().positive("Total biaya harus > 0."),
  notes: z.string().optional(),
});
export type UpdateFakturIndukInput = z.infer<typeof updateFakturIndukSchema>;

/** Generate the next Invoice Termin in sequence — the DB trigger
 * (fn_installment_validate) enforces the sum-vs-total-biaya guard; the app
 * doesn't duplicate that check. */
export const generateTerminSchema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi."),
  jatuhTempo: z.string().optional(),
  bankAccountId: z.string().optional(),
  ppnAktif: z.boolean().optional(),
  ppnPersen: z.coerce.number().optional(),
  pph23Aktif: z.boolean().optional(),
  pph23Persen: z.coerce.number().optional(),
  catatan: z.string().optional(),
});
export type GenerateTerminInput = z.infer<typeof generateTerminSchema>;

/** Explicit bare-`.optional()` fields, no `.default()` — see the Penawaran
 * status-PATCH lesson (Zod resolves `.default()` for absent keys even under
 * `.partial()`). */
export const updateTerminSchema = z.object({
  statusId: z.string().optional(),
  paidDate: z.string().nullable().optional(),
  jatuhTempo: z.string().nullable().optional(),
  bankAccountId: z.string().nullable().optional(),
  catatan: z.string().optional(),
});
export type UpdateTerminInput = z.infer<typeof updateTerminSchema>;
