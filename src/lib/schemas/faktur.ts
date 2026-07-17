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
  // Trigger/keterangan copied from the SPH's termin catatan (quotation_term_scheme.milestoneTriggerLabel), e.g. "Pelunasan".
  pemicu: z.string().nullable(),
  // Derived read-side from earlier sibling installments — never stored.
  previousTermins: z.array(z.object({ label: z.string(), nilai: z.number(), pemicu: z.string().nullable() })),
  catatan: z.string(),
  // Pembatalan Penawaran — set only on the one-off "Biaya Administrasi
  // Pengembalian" row generated at cancellation time (termId null).
  isCancellationFee: z.boolean(),
  // The last-paid termin whose value was deducted from the admin fee
  // shortfall — resolved so the UI can render a clickable reference.
  referencedInstallment: z.object({ id: z.string(), label: z.string(), number: z.string().nullable() }).nullable(),
});
export type InvoiceTermin = z.infer<typeof invoiceTerminSchema>;

export const fakturLayananSchema = z.object({
  serviceId: z.string().nullable(),
  nama: z.string(),
  // Best-effort pricing, traced from the source SPH's quotation_items (same
  // serviceId) via the Proyek's quotationId — null when the project has no
  // source SPH, or when no matching line item was found there.
  harga: z.number().nullable(),
  volume: z.number().nullable(),
  satuan: z.string().nullable(),
});

export const fakturTermSchemeItemSchema = z.object({
  label: z.string(),
  persen: z.coerce.number(),
  // Trigger/keterangan sourced from the SPH's termin catatan — nullable for
  // manually-created faktur term schemes with no source SPH.
  pemicu: z.string().nullable(),
});
export type FakturTermSchemeItem = z.infer<typeof fakturTermSchemeItemSchema>;

export const fakturIndukSchema = z.object({
  id: z.string(),
  number: z.string().nullable(), // e.g. INV/001/2026 — assigned by trigger, resets yearly
  proyekId: z.string(),
  proyekNama: z.string(),
  proyekNumber: z.string().nullable(), // e.g. PRY/014 — the parent Proyek
  sphNumber: z.string().nullable(), // e.g. SPH/006/6.2026 — resolved via the Proyek's source quotation
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
  useDigitalSignature: z.boolean(),
  signatureTemplateId: z.string().nullable(),
  // Resolved from signatureTemplateId — read-only, for document rendering.
  signatureImage: z.string().nullable(),
  // Pembatalan Penawaran — set together with the BATAL status transition,
  // cascaded/mirrored from whichever of SPH/Proyek/Faktur triggered it.
  cancelReason: z.string().nullable(),
  cancelFee: z.number().nullable(),
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
  useDigitalSignature: z.boolean().default(false),
  signatureTemplateId: z.string().nullable().default(null),
});
export type CreateFakturIndukInput = z.infer<typeof createFakturIndukSchema>;

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
