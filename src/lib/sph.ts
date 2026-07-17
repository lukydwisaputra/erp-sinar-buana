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

/** "A", "A dan B", "A, B, dan C" — Indonesian list conjunction. */
function joinDan(items: string[]): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} dan ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, dan ${items[items.length - 1]}`;
}

/** Auto-generated opening sentence from the picked service names — a starting
 * point the user can still freely edit, not a fixed template (sph-form.tsx
 * only (re)writes this while the field still matches the last auto-generated
 * value, so a manual edit stops it from being overwritten). */
export function defaultKalimatPembuka(namaLayanan: string[]): string {
  const names = namaLayanan.map((n) => n.trim()).filter(Boolean);
  if (!names.length) return "";
  return `Sehubungan dengan adanya permintaan untuk ${joinDan(names)}. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:`;
}
