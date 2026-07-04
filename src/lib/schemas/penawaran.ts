import { z } from "zod";

export const sphStatus = z.enum(["draft", "terkirim", "deal", "ditolak", "dibatalkan"]);
export type SphStatus = z.infer<typeof sphStatus>;

export const rabRowSchema = z.object({
  uraian: z.string(),
  vol: z.coerce.number(),
  satuan: z.string(),
  hargaSatuan: z.coerce.number(),
});
export const itemRabSchema = z.object({
  personil: z.array(rabRowSchema),
  langsung: z.array(rabRowSchema),
});
export const itemJadwalSchema = z.object({
  kegiatan: z.array(z.string()),
  highlights: z.array(z.array(z.number())),
  bulan: z.coerce.number().min(1),
});

export const sphItemSchema = z.object({
  layananId: z.string(),
  nama: z.string(),
  volume: z.coerce.number(),
  harga: z.coerce.number(),
  satuan: z.string(),
  rab: itemRabSchema,
  jadwal: itemJadwalSchema,
});
export type SphItem = z.infer<typeof sphItemSchema>;
export const sphKelengkapanItemSchema = z.object({
  persyaratan: z.string(),
  status: z.enum(["ada", "tidak", ""]).default(""),
  keterangan: z.string().default(""),
});
export const sphKelengkapanSchema = z.object({
  templateId: z.string(),
  nama: z.string(),
  items: z.array(sphKelengkapanItemSchema),
});
export type SphKelengkapanItem = z.infer<typeof sphKelengkapanItemSchema>;
export type SphKelengkapan = z.infer<typeof sphKelengkapanSchema>;

export const sphTerminSchema = z.object({
  label: z.string(),
  persen: z.coerce.number(),
  pemicu: z.string(),
});

/** Builder form values (no computed totals; status defaults outside the form). */
export const sphFormSchema = z.object({
  perusahaanId: z.string().min(1, "Perusahaan wajib dipilih."),
  perusahaanNama: z.string(),
  alamat: z.string(),
  tanggal: z.string().min(1, "Tanggal wajib diisi."),
  masaBerlakuAktif: z.boolean(),
  masaBerlakuHari: z.coerce.number(),
  kalimatPembuka: z.string(),
  lampiran: z.string(),
  /** Whether the RAB & Estimasi Jadwal appendix pages are managed/included. */
  rincianAktif: z.boolean().default(true),
  items: z.array(sphItemSchema).min(1, "Tambahkan minimal satu layanan."),
  termin: z.array(sphTerminSchema),
  catatan: z.array(z.string()),
  ppnAktif: z.boolean().default(false),
  ppnPersen: z.coerce.number().default(12),
  pph23Aktif: z.boolean().default(false),
  pph23Persen: z.coerce.number().default(2),
  jabatanPenerima: z.string().default("Direktur"),
  picAktif: z.boolean().default(false),
  picNama: z.string().default(""),
  picJabatan: z.string().default(""),
  kelengkapan: z.array(sphKelengkapanSchema).default([]),
});
export type SphFormValues = z.infer<typeof sphFormSchema>;

/** Persisted/list shape. `number` is the official document number (e.g.
 * SPH/00001/5.2026), DB-assigned by the numbering trigger — null until the
 * first insert completes. `id` (uuid) is the internal reference key; `number`
 * is what gets shown on the actual document/UI. */
export const sphSchema = sphFormSchema.extend({ id: z.string(), number: z.string().nullable(), status: sphStatus });
export type Sph = z.infer<typeof sphSchema>;

/** API input schemas for POST/PATCH /api/penawaran — same shape the builder
 * form already produces; `status` is create-time optional (server defaults to
 * "draft") and update-time used for pure status transitions. */
export const createPenawaranSchema = sphFormSchema.extend({
  status: sphStatus.optional(),
});
export type CreatePenawaranInput = z.infer<typeof createPenawaranSchema>;

/** Deliberately NOT `sphFormSchema.partial()` — Zod still resolves `.default()`
 * for keys missing from the input even under `.partial()`, so an update that
 * only sends `{ status }` would otherwise come back with every defaulted
 * field (ppnAktif, rincianAktif, ...) silently filled in and treated as
 * "provided", overwriting the real stored values. Every field here is a bare
 * `.optional()` with no default, so `quotationColumnsFromInput`'s `!==
 * undefined` checks only see fields the caller actually sent. */
export const updatePenawaranSchema = z.object({
  perusahaanId: z.string().min(1).optional(),
  perusahaanNama: z.string().optional(),
  alamat: z.string().optional(),
  tanggal: z.string().min(1).optional(),
  masaBerlakuAktif: z.boolean().optional(),
  masaBerlakuHari: z.coerce.number().optional(),
  kalimatPembuka: z.string().optional(),
  lampiran: z.string().optional(),
  rincianAktif: z.boolean().optional(),
  items: z.array(sphItemSchema).min(1).optional(),
  termin: z.array(sphTerminSchema).optional(),
  catatan: z.array(z.string()).optional(),
  ppnAktif: z.boolean().optional(),
  ppnPersen: z.coerce.number().optional(),
  pph23Aktif: z.boolean().optional(),
  pph23Persen: z.coerce.number().optional(),
  jabatanPenerima: z.string().optional(),
  picAktif: z.boolean().optional(),
  picNama: z.string().optional(),
  picJabatan: z.string().optional(),
  kelengkapan: z.array(sphKelengkapanSchema).optional(),
  status: sphStatus.optional(),
});
export type UpdatePenawaranInput = z.infer<typeof updatePenawaranSchema>;
