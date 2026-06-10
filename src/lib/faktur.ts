import type { Faktur, FakturFormValues } from "@/lib/schemas/faktur";

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

/** A faktur is overdue when its due date passed and it isn't paid yet. */
export function isFakturOverdue(f: Pick<Faktur, "status" | "jatuhTempo">): boolean {
  return f.status !== "lunas" && !!f.jatuhTempo && new Date(f.jatuhTempo + "T23:59:59") < new Date();
}

/** Payment status of a single termin, derived from its faktur (or none). */
export type TerminPaymentStatus = "lunas" | "menunggu" | "draft" | "belum";

function terminStatusOf(f: Faktur | null): TerminPaymentStatus {
  if (!f) return "belum";
  if (f.status === "lunas") return "lunas";
  if (f.status === "draft") return "draft";
  return "menunggu"; // terkirim, awaiting payment
}

export type DealTerminRow = {
  index: number;
  label: string;
  persen: number;
  pemicu: string;
  nilai: number;
  faktur: Faktur | null;
  status: TerminPaymentStatus;
  overdue: boolean;
  /** A termin may be invoiced only once every earlier termin is fully paid. */
  canCreate: boolean;
};

export type DealRekap = {
  key: string;
  sphId: string;
  perusahaanNama: string;
  totalBiaya: number;
  termins: DealTerminRow[];
  terbayar: number;
  persenTerbayar: number;
};

/**
 * Group invoices by their source deal (sphId; manual invoices group by their
 * own id) and derive the payment status of every termin in the deal's schedule
 * — including termins that have no invoice yet ("belum difakturkan").
 */
export function groupFakturByDeal(fakturs: Faktur[]): DealRekap[] {
  const groups = new Map<string, Faktur[]>();
  for (const f of fakturs) {
    const key = f.sphId || f.id;
    const arr = groups.get(key) ?? [];
    arr.push(f);
    groups.set(key, arr);
  }
  return Array.from(groups, ([key, arr]) => {
    const rep = arr[0];
    const total = totalBiaya(rep.items);
    const termins: DealTerminRow[] = rep.terminList.map((t, index) => {
      const faktur = arr.find((f) => f.terminIndex === index) ?? null;
      return {
        index,
        label: t.label,
        persen: num(t.persen),
        pemicu: t.pemicu,
        nilai: (num(t.persen) / 100) * total,
        faktur,
        status: terminStatusOf(faktur),
        overdue: faktur ? isFakturOverdue(faktur) : false,
        canCreate: false,
      };
    });
    // Sequential billing: a termin can be invoiced only after every earlier
    // termin is paid (lunas). Enables the next eligible termin one at a time.
    let prevAllLunas = true;
    for (const t of termins) {
      t.canCreate = t.status === "belum" && prevAllLunas;
      prevAllLunas = prevAllLunas && t.status === "lunas";
    }
    const terbayar = termins.filter((t) => t.status === "lunas").reduce((s, t) => s + t.nilai, 0);
    return {
      key,
      sphId: rep.sphId,
      perusahaanNama: rep.perusahaanNama,
      totalBiaya: total,
      termins,
      terbayar,
      persenTerbayar: total ? (terbayar / total) * 100 : 0,
    };
  });
}

const ROMAN: [number, string][] = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
/** Small positive integer → Roman numeral (termin headings). */
export function toRoman(n: number): string {
  let out = "";
  let x = Math.max(0, Math.floor(n));
  for (const [v, s] of ROMAN) while (x >= v) { out += s; x -= v; }
  return out;
}
