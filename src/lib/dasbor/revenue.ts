import type { Faktur } from "@/lib/schemas/faktur";
import { computeFaktur } from "@/lib/faktur";
import { dalamPeriode } from "@/lib/dasbor/period";
import type { Periode } from "@/lib/dasbor/types";

/** Issued = recognized on accrual: status terkirim or lunas. */
export function fakturDiterbitkan(f: Faktur): boolean {
  return f.status === "terkirim" || f.status === "lunas";
}

/** Total recognized revenue (service value ex-PPN) for issued fakturs in period. */
export function pendapatanPeriode(fakturs: Faktur[], periode: Periode): number {
  return fakturs.reduce((sum, f) => {
    if (!fakturDiterbitkan(f) || !dalamPeriode(f.tanggal, periode)) return sum;
    return sum + computeFaktur(f).nilaiTermin;
  }, 0);
}

/** Recognized revenue to date, grouped by sphId (period-agnostic). */
export function pendapatanPerSph(fakturs: Faktur[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const f of fakturs) {
    if (!fakturDiterbitkan(f)) continue;
    map.set(f.sphId, (map.get(f.sphId) ?? 0) + computeFaktur(f).nilaiTermin);
  }
  return map;
}

/** Accumulated PPh 23 credit from issued fakturs in period (income-tax credit). */
export function pph23KreditPeriode(fakturs: Faktur[], periode: Periode): number {
  return fakturs.reduce((sum, f) => {
    if (!fakturDiterbitkan(f) || !dalamPeriode(f.tanggal, periode)) return sum;
    return sum + computeFaktur(f).pph23;
  }, 0);
}
