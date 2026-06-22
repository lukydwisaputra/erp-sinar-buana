import { z } from "zod";

export const kewajibanJenis = z.enum(["ppn", "pph21", "pph23", "bpjs", "pph_badan"]);
export type KewajibanJenis = z.infer<typeof kewajibanJenis>;

export const kewajibanStatus = z.enum(["belum_setor", "disetor"]);
export type KewajibanStatus = z.infer<typeof kewajibanStatus>;

export const kewajibanPajakSchema = z.object({
  id: z.string(),
  jenis: kewajibanJenis,
  /** Tax period, e.g. "2026-06". */
  periode: z.string(),
  jumlah: z.number().nonnegative(),
  jatuhTempo: z.string(),
  status: kewajibanStatus,
  /** PPh 23 withholding slip received (credit secured). Always true for non-pph23. */
  buktiPotongDiterima: z.boolean(),
  keterangan: z.string(),
});
export type KewajibanPajak = z.infer<typeof kewajibanPajakSchema>;
