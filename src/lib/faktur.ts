/**
 * Compute after-tax amount for a given nilaiTermin using explicit PPN/PPH
 * settings. Uses DPP nilai lain method for PPN (base = 11/12 × nilai termin).
 * Kept standalone (not folded into src/lib/faktur/mapping.ts) since Penawaran
 * and Proyek — not just Faktur — both derive contract/estimate values with it
 * before a real Faktur Induk exists yet.
 */
export type TaxBreakdown = { dpp: number; ppn: number; pph23: number; net: number };

export function taxBreakdown(
  nilaiTermin: number,
  ppnAktif: boolean,
  ppnPersen: number,
  pph23Aktif: boolean,
  pph23Persen: number,
): TaxBreakdown {
  const dpp = (11 / 12) * nilaiTermin;
  const ppn = ppnAktif ? Math.round((ppnPersen / 100) * dpp) : 0;
  const pph23 = pph23Aktif ? (pph23Persen / 100) * nilaiTermin : 0;
  return { dpp, ppn, pph23, net: nilaiTermin + ppn - pph23 };
}

export function afterTaxAmount(
  nilaiTermin: number,
  ppnAktif: boolean,
  ppnPersen: number,
  pph23Aktif: boolean,
  pph23Persen: number,
): number {
  return taxBreakdown(nilaiTermin, ppnAktif, ppnPersen, pph23Aktif, pph23Persen).net;
}
