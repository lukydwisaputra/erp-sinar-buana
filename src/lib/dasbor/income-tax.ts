import type { PajakConfig } from "@/lib/schemas/pajak-config";

/**
 * Estimated income tax (PPh Badan). Always an estimate.
 * - final_05: tarifFinalPersen% of revenue (PP 55/2022); profit & credit ignored.
 * - badan_22: tarifBadanPersen% of positive operating profit, minus accumulated
 *   PPh 23 credit, floored at 0.
 */
export function estimasiPphBadan(args: {
  config: PajakConfig;
  pendapatan: number;
  labaOperasional: number;
  pph23Kredit: number;
}): number {
  const { config, pendapatan, labaOperasional, pph23Kredit } = args;
  if (config.metode === "final_05") {
    return Math.round((config.tarifFinalPersen / 100) * pendapatan);
  }
  const dasar = Math.max(0, labaOperasional);
  const bruto = Math.round((config.tarifBadanPersen / 100) * dasar);
  return Math.max(0, bruto - pph23Kredit);
}
