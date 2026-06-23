import { z } from "zod";

export const slipStatus = z.enum(["menunggu_pembayaran", "sudah_dibayar"]);

export const slipGajiSchema = z.object({
  id: z.string(),
  batchId: z.string(),

  karyawanId: z.string(),
  karyawanNama: z.string(),
  jabatan: z.string(),
  statusKepegawaian: z.enum(["tetap", "kontrak", "probation"]),
  pengali: z.number(),
  gajiPokok: z.number(),
  tunjangan: z.number().min(0),

  lembur: z.number().min(0),
  bonus: z.number().min(0),
  pph21: z.number().min(0),
  bpjsPotongan: z.number().min(0),

  bankNama: z.string(),
  bankNomor: z.string(),
  bankAtasNama: z.string(),

  status: slipStatus,
  paidAt: z.string().nullable(),
});

export const penggajianBatchSchema = z.object({
  id: z.string(),
  periode: z.object({
    mulai: z.string(),
    selesai: z.string(),
  }),
  /** Planned payment date (ISO yyyy-mm-dd) set by user when creating the batch. */
  tanggalBayar: z.string(),
  slips: z.array(slipGajiSchema),
  createdAt: z.string(),
});

export type SlipGaji = z.infer<typeof slipGajiSchema>;
export type SlipStatus = z.infer<typeof slipStatus>;
export type PenggajianBatch = z.infer<typeof penggajianBatchSchema>;

export function calcSlip(slip: Pick<SlipGaji, "gajiPokok" | "pengali" | "tunjangan" | "lembur" | "bonus" | "pph21" | "bpjsPotongan">) {
  const gajiPokokEfektif = slip.gajiPokok * slip.pengali;
  const penggajianKotor = gajiPokokEfektif + slip.tunjangan + slip.lembur + slip.bonus;
  const penggajianBersih = penggajianKotor - slip.pph21 - slip.bpjsPotongan;
  return { gajiPokokEfektif, penggajianKotor, penggajianBersih };
}
