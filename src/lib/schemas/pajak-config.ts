import { z } from "zod";

/** Income-tax (PPh Badan) computation method. */
export const pphBadanMetode = z.enum(["final_05", "badan_22"]);
export type PphBadanMetode = z.infer<typeof pphBadanMetode>;

export const pajakConfigSchema = z.object({
  metode: pphBadanMetode,
  /** PPh Final rate as a percent of revenue (PP 55/2022), e.g. 0.5. */
  tarifFinalPersen: z.number().nonnegative(),
  /** PPh Badan rate as a percent of taxable profit, e.g. 22. */
  tarifBadanPersen: z.number().nonnegative(),
  /** Annual revenue threshold (IDR) — Rp 4.8B. */
  ambangOmzet: z.number().nonnegative(),
});
export type PajakConfig = z.infer<typeof pajakConfigSchema>;
