import { z } from "zod";

export const tarifConfigSchema = z.object({
  ppnPersenDefault: z.number().min(0).max(100),          // VR-00.3
  pph23PersenDefault: z.number().min(0).max(100),
  statusPkp: z.boolean(),                                  // VR-00.6
  jatuhTempoFakturHari: z.number().int().min(0),            // VR-00.4
  jatuhTempoPpnHari: z.number().int().min(0),
  jatuhTempoPphHari: z.number().int().min(0),
  jatuhTempoBpjsHari: z.number().int().min(0),
  masaBerlakuPenawaranHariDefault: z.number().int().min(0),
  pengaliProbationDefault: z.number().positive(),          // VR-00.2 — fallback if Daftar Pilihan has no explicit probation row
});
export type TarifConfig = z.infer<typeof tarifConfigSchema>;
