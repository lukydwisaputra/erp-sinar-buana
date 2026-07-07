import { z } from "zod";

/** Real `cashflow_entries` shape (read-only visibility only this pass —
 * manual-entry CRUD and forecast/settlement UI stay out of scope; see the
 * Faktur plan). Entries are produced either by a document trigger (Faktur's
 * LUNAS automation) or, previously, manually — manual creation is no longer
 * offered from this app, but old rows may still carry sumber "manual". */
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
