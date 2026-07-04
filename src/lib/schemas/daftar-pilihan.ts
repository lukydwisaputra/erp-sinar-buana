import { z } from "zod";

export const daftarPilihanKategori = z.enum([
  "jenis_dokumen", "kewenangan", "dasar_hukum", "area_kawasan",
  "jabatan", "status_kepegawaian", "komponen_gaji", "rekening_bank",
]);
export type DaftarPilihanKategori = z.infer<typeof daftarPilihanKategori>;

// Matches db-schema's real `salary_component_kind`/`salary_calc_type` enums
// (db-schema/src/schema/enums.ts) — komponen_gaji only.
export const komponenGajiKind = z.enum(["tunjangan", "potongan"]);
export type KomponenGajiKind = z.infer<typeof komponenGajiKind>;

export const calcMethod = z.enum(["nominal", "persentase", "per_hari"]);
export type CalcMethod = z.infer<typeof calcMethod>;

/** Extra per-category metadata — only the relevant fields are populated per category. */
export const optionExtraSchema = z.object({
  pengali: z.number().positive().optional(),       // status_kepegawaian only (VR-00.2)
  kind: komponenGajiKind.optional(),                // komponen_gaji only
  calcMethod: calcMethod.optional(),                // komponen_gaji only
  defaultValue: z.number().optional(),              // komponen_gaji only
  isEmployerPortion: z.boolean().optional(),         // komponen_gaji only (BPJS employer side)
  isDefault: z.boolean().optional(),                 // rekening_bank only
  bank: z.object({
    nama: z.string().min(1), atasNama: z.string().min(1),
    nomor: z.string().regex(/^\d+$/, "Nomor rekening harus angka."), // VR-00.8
  }).optional(),                                    // rekening_bank only
});
export type OptionExtra = z.infer<typeof optionExtraSchema>;

export const optionItemSchema = z.object({
  id: z.string(),
  kategori: daftarPilihanKategori,
  nama: z.string().min(1),
  urutan: z.number(),
  aktif: z.boolean(),
  // Always false — no DB column backs this today (no seeded row needs write
  // protection); kept only so the UI's existing `!item.locked` branches compile.
  locked: z.boolean(),
  extra: optionExtraSchema,
  createdAt: z.string(),
});
export type OptionItem = z.infer<typeof optionItemSchema>;
