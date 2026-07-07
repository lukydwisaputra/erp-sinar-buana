import type { FakturTerminRow } from "@/lib/faktur/mapping";
import { dalamPeriode } from "@/lib/dasbor/period";
import type { Periode } from "@/lib/dasbor/types";

/** Issued = recognized on accrual: any generated termin that hasn't been
 * cancelled (no separate draft/terkirim state exists anymore — generating a
 * termin at all creates a real invoice row, see the Faktur plan). */
export function fakturDiterbitkan(f: FakturTerminRow): boolean {
  return f.statusSystemRole !== "BATAL";
}

/** Total recognized revenue (service value ex-PPN) for issued termins in period. */
export function pendapatanPeriode(fakturs: FakturTerminRow[], periode: Periode): number {
  return fakturs.reduce((sum, f) => {
    if (!fakturDiterbitkan(f) || !dalamPeriode(f.tanggal, periode)) return sum;
    return sum + f.nilaiTermin;
  }, 0);
}

/** Recognized revenue to date, grouped by proyekId (period-agnostic). Keyed
 * by proyekId rather than sphId — Faktur is proyek-scoped now, and this also
 * works for manually-created projects with no linked quotation. */
export function pendapatanPerProyek(fakturs: FakturTerminRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const f of fakturs) {
    if (!fakturDiterbitkan(f)) continue;
    map.set(f.proyekId, (map.get(f.proyekId) ?? 0) + f.nilaiTermin);
  }
  return map;
}

/** Accumulated PPh 23 credit from issued termins in period (income-tax credit). */
export function pph23KreditPeriode(fakturs: FakturTerminRow[], periode: Periode): number {
  return fakturs.reduce((sum, f) => {
    if (!fakturDiterbitkan(f) || !dalamPeriode(f.tanggal, periode)) return sum;
    return sum + f.pph23;
  }, 0);
}
