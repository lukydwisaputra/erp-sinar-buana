import { z } from "zod";

/** Reusable Estimasi Jadwal templates (Konfigurasi > Template > Jadwal),
 * applied as a one-time copy into an SPH item's `jadwal` — same shape as
 * `itemJadwalSchema` in schemas/penawaran.ts, so applying is a direct assign. */
export const jadwalTemplateSchema = z.object({
  id: z.string(), // uuid (jadwal_templates.id)
  nama: z.string(),
  kegiatan: z.array(z.string()),
  highlights: z.array(z.array(z.number())),
  bulan: z.coerce.number().min(1),
});
export type JadwalTemplate = z.infer<typeof jadwalTemplateSchema>;

/** API input schema — server-side validation for POST/PATCH /api/jadwal-templates. */
export const createJadwalTemplateSchema = z.object({
  nama: z.string().min(1, "Nama template wajib diisi."),
  kegiatan: z.array(z.string()).min(1, "Tambahkan minimal satu kegiatan."),
  highlights: z.array(z.array(z.coerce.number())),
  bulan: z.coerce.number().min(1),
});
export type CreateJadwalTemplateInput = z.infer<typeof createJadwalTemplateSchema>;

export const updateJadwalTemplateSchema = z.object({
  nama: z.string().min(1).optional(),
  kegiatan: z.array(z.string()).min(1).optional(),
  highlights: z.array(z.array(z.coerce.number())).optional(),
  bulan: z.coerce.number().min(1).optional(),
});
export type UpdateJadwalTemplateInput = z.infer<typeof updateJadwalTemplateSchema>;
