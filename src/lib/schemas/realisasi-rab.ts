import { z } from "zod";

/** RAB cost categories — Personil (A) and Langsung (B). */
export const rabKategori = z.enum(["personil", "langsung"]);
export type RabKategori = z.infer<typeof rabKategori>;

export const realisasiRabSchema = z.object({
  id: z.string(),
  proyekId: z.string(),
  kategori: rabKategori,
  /** Free label of the RAB line/category this actual maps to. */
  rabLineLabel: z.string(),
  /** Actual cost in IDR. */
  jumlah: z.number().positive(),
  tanggal: z.string(),
  keterangan: z.string(),
  /** Optional link to the source cashflow expense entry. */
  arusKasId: z.string().optional(),
});
export type RealisasiRab = z.infer<typeof realisasiRabSchema>;

export const realisasiRabFormSchema = z.object({
  proyekId: z.string().min(1, "Proyek wajib dipilih."),
  kategori: rabKategori,
  rabLineLabel: z.string().min(1, "Baris RAB wajib diisi."),
  jumlah: z.number().positive("Jumlah harus > 0."),
  tanggal: z.string().min(1, "Tanggal wajib diisi."),
  keterangan: z.string().min(1, "Keterangan wajib diisi."),
  arusKasId: z.string().optional(),
});
export type RealisasiRabFormValues = z.infer<typeof realisasiRabFormSchema>;
