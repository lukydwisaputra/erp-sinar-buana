import type { ArusKasEntry } from "@/lib/schemas/arus-kas";
import type { Periode } from "@/lib/dasbor/types";
import { dalamPeriode } from "@/lib/dasbor/period";

export type MonthlySummary = {
  totalPemasukan: number;
  totalPengeluaran: number;
  saldoAkhir: number;
  saldoPerBulan: { bulan: string; saldo: number }[];
};

/** FR-09.1 — Ringkasan Keuangan Bulanan. */
export function computeMonthlySummary(entries: ArusKasEntry[], periode: Periode): MonthlySummary {
  const active = entries.filter((e) => !e.isCancelled && dalamPeriode(e.tanggal, periode));
  const totalPemasukan = active.filter((e) => e.jenis === "kredit").reduce((s, e) => s + e.jumlah, 0);
  const totalPengeluaran = active.filter((e) => e.jenis === "debit").reduce((s, e) => s + e.jumlah, 0);

  const byMonth = new Map<string, number>();
  for (const e of active) {
    const bulan = e.tanggal.slice(0, 7); // yyyy-mm
    const delta = e.jenis === "kredit" ? e.jumlah : -e.jumlah;
    byMonth.set(bulan, (byMonth.get(bulan) ?? 0) + delta);
  }
  const saldoPerBulan = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bulan, saldo]) => ({ bulan, saldo }));

  return {
    totalPemasukan,
    totalPengeluaran,
    saldoAkhir: totalPemasukan - totalPengeluaran,
    saldoPerBulan,
  };
}

export type KategoriSlice = { kategori: string; jumlah: number };

const TOP_N = 5;

/** FR-09.2 — top-N categories + a "Lainnya" bucket for the rest, per channel. */
export function groupByKategori(entries: ArusKasEntry[], jenis: "kredit" | "debit"): KategoriSlice[] {
  const active = entries.filter((e) => !e.isCancelled && e.jenis === jenis);
  const byKategori = new Map<string, number>();
  for (const e of active) {
    byKategori.set(e.kategori, (byKategori.get(e.kategori) ?? 0) + e.jumlah);
  }
  const sorted = [...byKategori.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([kategori, jumlah]) => ({ kategori, jumlah }));

  if (sorted.length <= TOP_N) return sorted;
  const top = sorted.slice(0, TOP_N);
  const lainnya = sorted.slice(TOP_N).reduce((s, r) => s + r.jumlah, 0);
  return [...top, { kategori: "Lainnya", jumlah: lainnya }];
}
