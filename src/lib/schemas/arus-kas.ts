import { z } from "zod";

export const arusKasJenis = z.enum(["kredit", "debit"]);
export type ArusKasJenis = z.infer<typeof arusKasJenis>;

export const arusKasKategori = z.enum([
  "faktur", "penggajian", "pajak", "bonus", "operasional", "lainnya",
]);
export type ArusKasKategori = z.infer<typeof arusKasKategori>;

export const arusKasSumber = z.enum([
  "manual", "otomatis_faktur", "otomatis_penggajian", "otomatis_pajak",
]);
export type ArusKasSumber = z.infer<typeof arusKasSumber>;

export const MANUAL_KATEGORIS: ArusKasKategori[] = ["operasional", "lainnya"];

export const arusKasEntrySchema = z.object({
  id: z.string(),
  jenis: arusKasJenis,
  tanggal: z.string(),
  jumlah: z.number().positive(),
  kategori: arusKasKategori,
  sumber: arusKasSumber,
  keterangan: z.string(),
  referensiId: z.string().optional(),
  referensiLabel: z.string().optional(),
  proyekId: z.string().optional(),
  locked: z.boolean(),
});

export type ArusKasEntry = z.infer<typeof arusKasEntrySchema>;

export const arusKasFormSchema = z.object({
  jenis: arusKasJenis,
  tanggal: z.string().min(1, "Tanggal wajib diisi."),
  jumlah: z.number().positive("Total harus > 0."),
  kategori: z.enum(["operasional", "lainnya"]),
  keterangan: z.string().min(1, "Keterangan wajib diisi."),
  proyekId: z.string().optional(),
});

export type ArusKasFormValues = z.infer<typeof arusKasFormSchema>;
