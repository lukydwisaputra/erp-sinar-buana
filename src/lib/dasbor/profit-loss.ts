import type { Faktur } from "@/lib/schemas/faktur";
import type { RealisasiRab } from "@/lib/schemas/realisasi-rab";
import type { ArusKasEntry } from "@/lib/schemas/arus-kas";
import type { SifatBeban } from "@/lib/schemas/expense-nature";
import type { PajakConfig } from "@/lib/schemas/pajak-config";
import type { LabaRugi, Periode } from "@/lib/dasbor/types";
import { dalamPeriode } from "@/lib/dasbor/period";
import { pendapatanPeriode, pph23KreditPeriode } from "@/lib/dasbor/revenue";
import { estimasiPphBadan } from "@/lib/dasbor/income-tax";

/** COGS = realisasi RAB recorded within the period. */
export function hppPeriode(realisasi: RealisasiRab[], periode: Periode): number {
  return realisasi.reduce((s, r) => (dalamPeriode(r.tanggal, periode) ? s + r.jumlah : s), 0);
}

/** Opex = cashflow entries flagged operasional, within the period. */
export function bebanOperasionalPeriode(
  arusKas: ArusKasEntry[],
  natureOf: (kategori: string) => SifatBeban,
  periode: Periode,
): number {
  return arusKas.reduce((s, e) => {
    if (!dalamPeriode(e.tanggal, periode)) return s;
    return natureOf(e.kategori) === "operasional" ? s + e.jumlah : s;
  }, 0);
}

const pct = (num: number, den: number): number => (den === 0 ? 0 : (num / den) * 100);

export function computeLabaRugi(args: {
  fakturs: Faktur[];
  realisasi: RealisasiRab[];
  arusKas: ArusKasEntry[];
  natureOf: (kategori: string) => SifatBeban;
  config: PajakConfig;
  periode: Periode;
}): LabaRugi {
  const { fakturs, realisasi, arusKas, natureOf, config, periode } = args;
  const pendapatan = pendapatanPeriode(fakturs, periode);
  const hpp = hppPeriode(realisasi, periode);
  const labaKotor = pendapatan - hpp;
  const bebanOperasional = bebanOperasionalPeriode(arusKas, natureOf, periode);
  const labaOperasional = labaKotor - bebanOperasional;
  const pph23Kredit = pph23KreditPeriode(fakturs, periode);
  const pphBadan = estimasiPphBadan({ config, pendapatan, labaOperasional, pph23Kredit });
  const labaBersih = labaOperasional - pphBadan;
  return {
    pendapatan,
    hpp,
    labaKotor,
    marginKotorPersen: pct(labaKotor, pendapatan),
    bebanOperasional,
    labaOperasional,
    pphBadan,
    pphBadanEstimasi: true,
    labaBersih,
    marginBersihPersen: pct(labaBersih, pendapatan),
    adaPendapatanTanpaBiaya: pendapatan > 0 && hpp === 0,
  };
}
