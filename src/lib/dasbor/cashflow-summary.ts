import type { ArusKasEntry } from "@/lib/schemas/arus-kas";
import type { Periode } from "@/lib/dasbor/types";
import { dalamPeriode } from "@/lib/dasbor/period";

/** "Saldo" entries are opening-balance/adjustment postings — real cash, but
 * not business income or expense. They're excluded from Pemasukan/
 * Pengeluaran (and Pendapatan, which reads off pemasukanPeriode) and only
 * ever affect the running kas balance (saldoAkhir/saldoPerBulan below, and
 * Kas Saat Ini in forecast.ts, which stays unfiltered by design). */
export const isSaldoKategori = (kategori: string): boolean => kategori === "Saldo";

export type MonthlySummary = {
  totalPemasukan: number;
  totalPengeluaran: number;
  saldoAkhir: number;
  saldoPerBulan: { bulan: string; saldo: number }[];
};

/** Total kas masuk (kredit) dalam periode, excluding Saldo — shared with
 * Pendapatan on the P&L so the two stay identical by construction (see
 * computeLabaRugi). */
export function pemasukanPeriode(entries: ArusKasEntry[], periode: Periode): number {
  return entries
    .filter((e) => !e.isCancelled && e.jenis === "kredit" && !isSaldoKategori(e.kategori) && dalamPeriode(e.tanggal, periode))
    .reduce((s, e) => s + e.jumlah, 0);
}

/** FR-09.1 — Ringkasan Keuangan Bulanan. */
export function computeMonthlySummary(entries: ArusKasEntry[], periode: Periode): MonthlySummary {
  const active = entries.filter((e) => !e.isCancelled && dalamPeriode(e.tanggal, periode));
  const totalPemasukan = pemasukanPeriode(entries, periode);
  const totalPengeluaran = active
    .filter((e) => e.jenis === "debit" && !isSaldoKategori(e.kategori))
    .reduce((s, e) => s + e.jumlah, 0);

  // Real cash movement, including Saldo — saldoAkhir/saldoPerBulan track the
  // actual balance, not just Pemasukan/Pengeluaran "activity".
  const byMonth = new Map<string, number>();
  for (const e of active) {
    const bulan = e.tanggal.slice(0, 7); // yyyy-mm
    const delta = e.jenis === "kredit" ? e.jumlah : -e.jumlah;
    byMonth.set(bulan, (byMonth.get(bulan) ?? 0) + delta);
  }
  const saldoPerBulan = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bulan, saldo]) => ({ bulan, saldo }));
  const saldoAkhir = active.reduce((s, e) => s + (e.jenis === "kredit" ? e.jumlah : -e.jumlah), 0);

  return {
    totalPemasukan,
    totalPengeluaran,
    saldoAkhir,
    saldoPerBulan,
  };
}

export type KategoriSlice = { kategori: string; jumlah: number };

const TOP_N = 5;

/** FR-09.2 — top-N categories + a "Lainnya" bucket for the rest, per channel.
 * Excludes Saldo — it's excluded from Pemasukan/Pengeluaran, so it has no
 * place in a breakdown of those totals either. */
export function groupByKategori(entries: ArusKasEntry[], jenis: "kredit" | "debit"): KategoriSlice[] {
  const active = entries.filter((e) => !e.isCancelled && e.jenis === jenis && !isSaldoKategori(e.kategori));
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
