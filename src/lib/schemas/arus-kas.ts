import { z } from "zod";

/** Real `cashflow_entries` shape. Entries are produced either by a document
 * trigger (Faktur's LUNAS automation, Pembatalan Penawaran) or manually via
 * `createArusKasEntrySchema` below — manual rows are never `isLocked`, so
 * they stay editable/cancellable unlike trigger-owned automation rows. */
export const arusKasJenis = z.enum(["kredit", "debit"]);
export type ArusKasJenis = z.infer<typeof arusKasJenis>;

export const arusKasSumber = z.enum(["manual", "faktur", "penggajian", "pajak"]);
export type ArusKasSumber = z.infer<typeof arusKasSumber>;

export const arusKasEntrySchema = z.object({
  id: z.string(),
  jenis: arusKasJenis,
  tanggal: z.string(),
  jumlah: z.number(),
  kategori: z.string(),
  sumber: arusKasSumber,
  keterangan: z.string(),
  proyekId: z.string().nullable(),
  locked: z.boolean(),
  isCancelled: z.boolean(),
});
export type ArusKasEntry = z.infer<typeof arusKasEntrySchema>;

/** Manual entry — API input for POST /api/arus-kas. `categoryId` (not a free
 * label) since every cashflow_entries row is category-keyed by FK. */
export const createArusKasEntrySchema = z.object({
  jenis: arusKasJenis,
  tanggal: z.string().min(1, "Tanggal wajib diisi."),
  jumlah: z.coerce.number().positive("Jumlah harus > 0."),
  categoryId: z.string().min(1, "Kategori wajib dipilih."),
  keterangan: z.string().optional(),
});
export type CreateArusKasEntryInput = z.infer<typeof createArusKasEntrySchema>;
