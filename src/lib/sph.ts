export type SphItemCalc = { volume: number; harga: number };
export type SphRabCalc = { personil: number; langsung: number };
export type SphTerminCalc = { persen: number };

export function totalPenawaran(items: SphItemCalc[]): number {
  return items.reduce((sum, it) => sum + (Number(it.volume) || 0) * (Number(it.harga) || 0), 0);
}
export function totalRab(rab: SphRabCalc): number {
  return (Number(rab.personil) || 0) + (Number(rab.langsung) || 0);
}
export function margin(items: SphItemCalc[], rab: SphRabCalc): number {
  return totalPenawaran(items) - totalRab(rab);
}
export function terminPersenTotal(termin: SphTerminCalc[]): number {
  return termin.reduce((sum, t) => sum + (Number(t.persen) || 0), 0);
}
export function isTerminValid(termin: SphTerminCalc[]): boolean {
  return terminPersenTotal(termin) === 100;
}
