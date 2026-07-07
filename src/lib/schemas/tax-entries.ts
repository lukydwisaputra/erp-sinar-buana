import { z } from "zod";

/** Real `tax_entries` shape (read-only visibility only this pass — manual
 * create, settlement workflow (bukti-potong upload, NTPN, settle actions),
 * and Tax Center config all stay out of scope; see the Faktur plan). */
export const taxType = z.enum([
  "ppn_keluaran", "ppn_masukan", "pph23_dipotong", "pph21", "bpjs_kesehatan", "bpjs_ketenagakerjaan",
]);
export type TaxType = z.infer<typeof taxType>;

export const taxNature = z.enum(["kewajiban", "kredit"]);
export type TaxNature = z.infer<typeof taxNature>;

export const taxSettlementStatus = z.enum(["belum_disetor", "terlambat", "sudah_disetor"]);
export type TaxSettlementStatus = z.infer<typeof taxSettlementStatus>;

export const taxEntrySchema = z.object({
  id: z.string(),
  taxType,
  nature: taxNature,
  taxPeriod: z.string(),
  jumlah: z.number(),
  dueDate: z.string().nullable(),
  settlementStatus: taxSettlementStatus,
  settledDate: z.string().nullable(),
  ntpn: z.string().nullable(),
  buktiPotongReceived: z.boolean(),
  notes: z.string(),
  companyId: z.string().nullable(),
  employeeId: z.string().nullable(),
});
export type TaxEntry = z.infer<typeof taxEntrySchema>;
