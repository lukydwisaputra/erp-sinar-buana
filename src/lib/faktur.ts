import type { FakturFormValues } from "@/lib/schemas/faktur";

const num = (n: number) => (Number.isFinite(n) ? n : 0);

export function totalBiaya(items: FakturFormValues["items"]): number {
  return items.reduce((s, it) => s + num(it.volume) * num(it.harga), 0);
}

export type FakturTotals = {
  totalBiaya: number;
  previous: { label: string; persen: number; amount: number }[];
  nilaiTermin: number;
  pemicu: string;
  dpp: number;
  ppn: number;
  pph23: number;
  total: number;
};

/** Per-termin invoice math (DPP nilai lain: PPN base = 11/12 × nilai termin). */
export function computeFaktur(v: FakturFormValues): FakturTotals {
  const total = totalBiaya(v.items);
  const previous = v.terminList.slice(0, v.terminIndex).map((t) => ({
    label: t.label,
    persen: num(t.persen),
    amount: (num(t.persen) / 100) * total,
  }));
  const current = v.terminList[v.terminIndex];
  const nilaiTermin = current ? (num(current.persen) / 100) * total : 0;
  const dpp = (11 / 12) * nilaiTermin;
  const ppn = v.ppnAktif ? Math.round((num(v.ppnPersen) / 100) * dpp) : 0;
  const pph23 = v.pph23Aktif ? (num(v.pph23Persen) / 100) * nilaiTermin : 0;
  return {
    totalBiaya: total,
    previous,
    nilaiTermin,
    pemicu: current?.pemicu ?? "",
    dpp,
    ppn,
    pph23,
    total: nilaiTermin + ppn - pph23,
  };
}

const ROMAN: [number, string][] = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
/** Small positive integer → Roman numeral (termin headings). */
export function toRoman(n: number): string {
  let out = "";
  let x = Math.max(0, Math.floor(n));
  for (const [v, s] of ROMAN) while (x >= v) { out += s; x -= v; }
  return out;
}
