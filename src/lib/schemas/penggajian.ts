import { z } from "zod";

export const slipStatus = z.enum(["menunggu_pembayaran", "sudah_dibayar", "batal"]);

/** Allowance/deduction line item on a payslip — real `payslip_components`
 * shape, replacing the mock's flat `tunjangan`/`bpjsPotongan` scalars.
 * `lembur`/`bonus`/`pph21` stay top-level scalar fields (they map straight
 * to `payslips.overtime_amount`/`bonus_amount`/`pph21_amount` columns). */
export const payslipComponentKind = z.enum(["tunjangan", "potongan"]);
export const payslipComponentSchema = z.object({
  id: z.string(),
  salaryComponentId: z.string().nullable(),
  name: z.string(),
  kind: payslipComponentKind,
  amount: z.number(),
  isEmployerPortion: z.boolean(),
  sortOrder: z.number(),
});
export type PayslipComponent = z.infer<typeof payslipComponentSchema>;

export const slipGajiSchema = z.object({
  id: z.string(),
  batchId: z.string(), // synthetic — see toPenggajianBatch
  number: z.string().nullable(), // e.g. GAJ/001/6.2026 — null until assigned

  karyawanId: z.string(),
  karyawanNama: z.string(),
  jabatan: z.string(),
  statusKepegawaian: z.string(), // resolved employment_statuses.label, snapshot at creation
  pengali: z.number(),
  gajiPokok: z.number(),

  components: z.array(payslipComponentSchema),

  lembur: z.number().min(0),
  bonus: z.number().min(0),
  pph21: z.number().min(0),

  bankNama: z.string(),
  bankNomor: z.string(),
  bankAtasNama: z.string(),
  // Resolved from employees.phone/employees.email at read time — never read
  // from src/lib/fixtures/karyawan.ts directly (that was the old mock bug).
  telepon: z.string(),
  email: z.string(),

  statusId: z.string().nullable(),
  status: slipStatus,
  statusSystemRole: z.string().nullable(),
  paidAt: z.string().nullable(),
});
export type SlipGaji = z.infer<typeof slipGajiSchema>;
export type SlipStatus = z.infer<typeof slipStatus>;

export const penggajianBatchSchema = z.object({
  id: z.string(), // synthetic, e.g. GAJ-2026-06-01_2026-06-30
  periode: z.object({
    mulai: z.string(),
    selesai: z.string(),
  }),
  /** Planned payment date (ISO yyyy-mm-dd), written once per slip at batch creation. */
  tanggalBayar: z.string(),
  slips: z.array(slipGajiSchema),
  createdAt: z.string(),
});
export type PenggajianBatch = z.infer<typeof penggajianBatchSchema>;

/** Per-employee component line input for batch creation — mirrors
 * `payslipComponentSchema` minus DB-assigned fields. */
export const createComponentInputSchema = z.object({
  salaryComponentId: z.string().nullable().optional(),
  name: z.string().min(1, "Nama komponen wajib diisi."),
  kind: payslipComponentKind,
  amount: z.coerce.number(),
  isEmployerPortion: z.boolean().default(false),
});
export type CreateComponentInput = z.infer<typeof createComponentInputSchema>;

export const createSlipInputSchema = z.object({
  karyawanId: z.string().min(1),
  components: z.array(createComponentInputSchema).default([]),
  lembur: z.coerce.number().min(0).default(0),
  bonus: z.coerce.number().min(0).default(0),
  pph21: z.coerce.number().min(0).default(0),
});
export type CreateSlipInput = z.infer<typeof createSlipInputSchema>;

export const createBatchSchema = z.object({
  periode: z.object({ mulai: z.string().min(1), selesai: z.string().min(1) }),
  tanggalBayar: z.string().min(1, "Tanggal bayar wajib diisi."),
  slips: z.array(createSlipInputSchema).min(1, "Minimal satu karyawan."),
});
export type CreateBatchInput = z.infer<typeof createBatchSchema>;

/** Explicit bare-`.optional()` fields, no `.default()` — see the Penawaran
 * status-PATCH lesson (Zod resolves `.default()` for absent keys even under
 * `.partial()`). */
export const updateSlipSchema = z.object({
  components: z.array(createComponentInputSchema).optional(),
  lembur: z.coerce.number().min(0).optional(),
  bonus: z.coerce.number().min(0).optional(),
  pph21: z.coerce.number().min(0).optional(),
});
export type UpdateSlipInput = z.infer<typeof updateSlipSchema>;

/**
 * gross = base_effective (base × multiplier) + tunjangan-kind components +
 * lembur + bonus. net (take-home) = gross − PPh21 − potongan-kind components
 * that are NOT employer-portion (employer-portion lines, e.g. BPJS employer
 * share, are remitted separately and never reduce take-home).
 */
export function calcSlip(slip: {
  gajiPokok: number;
  pengali: number;
  lembur: number;
  bonus: number;
  pph21: number;
  components: Pick<PayslipComponent, "kind" | "amount" | "isEmployerPortion">[];
}) {
  const gajiPokokEfektif = slip.gajiPokok * slip.pengali;
  const tunjanganTotal = slip.components
    .filter((c) => c.kind === "tunjangan")
    .reduce((s, c) => s + c.amount, 0);
  const potonganTotal = slip.components
    .filter((c) => c.kind === "potongan" && !c.isEmployerPortion)
    .reduce((s, c) => s + c.amount, 0);
  const penggajianKotor = gajiPokokEfektif + tunjanganTotal + slip.lembur + slip.bonus;
  const penggajianBersih = penggajianKotor - slip.pph21 - potonganTotal;
  return { gajiPokokEfektif, tunjanganTotal, potonganTotal, penggajianKotor, penggajianBersih };
}
