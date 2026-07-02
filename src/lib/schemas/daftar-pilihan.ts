import { z } from "zod";

export const daftarPilihanKategori = z.enum([
  "jenis_dokumen", "kewenangan", "dasar_hukum", "area_kawasan",
  "jabatan", "status_kepegawaian", "komponen_gaji", "rekening_bank",
]);
export type DaftarPilihanKategori = z.infer<typeof daftarPilihanKategori>;

export const calcMethod = z.enum(["nominal_tetap", "persen_gaji_pokok", "manual"]);
export type CalcMethod = z.infer<typeof calcMethod>;

/** Extra per-category metadata — only the relevant fields are populated per category. */
export const optionExtraSchema = z.object({
  pengali: z.number().positive().optional(),      // status_kepegawaian only (VR-00.2)
  calcMethod: calcMethod.optional(),               // komponen_gaji only
  bank: z.object({
    nama: z.string().min(1), atasNama: z.string().min(1),
    nomor: z.string().regex(/^\d+$/, "Nomor rekening harus angka."), // VR-00.8
  }).optional(),                                   // rekening_bank only
});
export type OptionExtra = z.infer<typeof optionExtraSchema>;

export const optionItemSchema = z.object({
  id: z.string(),
  kategori: daftarPilihanKategori,
  nama: z.string().min(1),
  urutan: z.number(),
  aktif: z.boolean(),
  locked: z.boolean(),
  extra: optionExtraSchema,
  createdAt: z.string(),
});
export type OptionItem = z.infer<typeof optionItemSchema>;
