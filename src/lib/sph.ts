export type SphItemCalc = { volume: number; harga: number };
export type SphTerminCalc = { persen: number };

type RabRowCalc = { vol: number; hargaSatuan: number };
export type ItemRabCalc = { personil: RabRowCalc[]; langsung: RabRowCalc[] };
export type SphItemWithRab = SphItemCalc & { rab: ItemRabCalc };

export function totalPenawaran(items: SphItemCalc[]): number {
  return items.reduce((sum, it) => sum + (Number(it.volume) || 0) * (Number(it.harga) || 0), 0);
}

/** Sum of one item's RAB (A. personil + B. langsung). */
export function rabTotalOf(rab: ItemRabCalc): number {
  const sum = (rows: RabRowCalc[]) =>
    rows.reduce((s, r) => s + (Number(r.vol) || 0) * (Number(r.hargaSatuan) || 0), 0);
  return sum(rab.personil) + sum(rab.langsung);
}

/** Aggregate RAB across all items. */
export function totalRab(items: SphItemWithRab[]): number {
  return items.reduce((s, it) => s + rabTotalOf(it.rab), 0);
}

/** Estimasi margin = total penawaran − total RAB (both derived from the same items). */
export function margin(items: SphItemWithRab[]): number {
  return totalPenawaran(items) - totalRab(items);
}

export function terminPersenTotal(termin: SphTerminCalc[]): number {
  return termin.reduce((sum, t) => sum + (Number(t.persen) || 0), 0);
}
export function isTerminValid(termin: SphTerminCalc[]): boolean {
  return terminPersenTotal(termin) === 100;
}
