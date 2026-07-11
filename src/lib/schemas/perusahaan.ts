import { z } from "zod";
import { optionalEmail, optionalEmailDefaultEmpty } from "@/lib/schemas/common";

export const perusahaanStatus = z.enum(["aktif", "nonaktif"]);

/**
 * A contact person (PIC). A company may have several; the first one in the
 * list is treated as primary (`company_contacts.is_primary` in the DB) — no
 * separate UI control for this, to keep the form simple.
 */
export const picSchema = z.object({
  nama: z.string(),
  jabatan: z.string(), // maps to company_contacts.position (nullable in DB)
  telepon: z.string(),
  email: z.string().email(),
});
export type PIC = z.infer<typeof picSchema>;

/** Per-company rollup powering the detail-drawer mini dashboard. Computed
 * client-side from Penawaran/Proyek/Faktur (still mock-fixture modules) —
 * not a DB column. */
export const perusahaanMetrikSchema = z.object({
  jumlahPenawaran: z.number(),
  proyekAktif: z.number(),
  nilaiKontrak: z.number(), // IDR, lifetime contract value
  piutang: z.number(), // IDR, outstanding receivables
});
export type PerusahaanMetrik = z.infer<typeof perusahaanMetrikSchema>;

export const perusahaanSchema = z.object({
  id: z.string(), // uuid (companies.id)
  number: z.string().nullable(), // e.g. PRS/00001 — assigned by trigger, never reset
  nama: z.string(),
  npwp: z.string(),
  alamat: z.string(),
  kota: z.string(), // companies.city
  kabupaten: z.string(), // companies.regency
  email: z.string().email().nullable(),
  status: perusahaanStatus, // derived from companies.is_active
  pic: z.array(picSchema),
  metrik: perusahaanMetrikSchema,
});

export type Perusahaan = z.infer<typeof perusahaanSchema>;

/** API input schema — server-side validation for POST/PATCH /api/perusahaan. */
export const picInputSchema = z.object({
  nama: z.string().min(1, "Nama PIC wajib."),
  jabatan: z.string().optional().default(""),
  telepon: z.string().min(1, "Nomor HP PIC wajib."),
  email: optionalEmailDefaultEmpty,
});

export const createPerusahaanSchema = z.object({
  nama: z.string().min(1, "Nama perusahaan wajib diisi."),
  alamat: z.string().min(1, "Alamat wajib diisi."),
  kota: z.string().min(1, "Kota wajib diisi."),
  kabupaten: z.string().min(1, "Kabupaten wajib diisi."),
  npwp: z.string().regex(/^\d{1,16}$/, "NPWP wajib diisi, maksimal 16 digit angka."),
  email: optionalEmailDefaultEmpty,
  pic: z.array(picInputSchema).min(1, "Minimal satu PIC."),
});
export type CreatePerusahaanInput = z.infer<typeof createPerusahaanSchema>;

export const updatePerusahaanSchema = z.object({
  nama: z.string().min(1).optional(),
  alamat: z.string().min(1).optional(),
  kota: z.string().min(1).optional(),
  kabupaten: z.string().min(1).optional(),
  npwp: z.string().regex(/^\d{1,16}$/, "NPWP maksimal 16 digit angka.").optional(),
  email: optionalEmail,
  status: perusahaanStatus.optional(),
  pic: z.array(picInputSchema).min(1, "Minimal satu PIC.").optional(),
});
export type UpdatePerusahaanInput = z.infer<typeof updatePerusahaanSchema>;
