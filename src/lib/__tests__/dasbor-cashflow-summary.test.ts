import { describe, it, expect } from "vitest";
import { computeMonthlySummary, groupByKategori } from "@/lib/dasbor/cashflow-summary";
import type { ArusKasEntry } from "@/lib/schemas/arus-kas";

const juni = { mulai: "2026-06-01", selesai: "2026-06-30" };

function mk(overrides: Partial<ArusKasEntry>): ArusKasEntry {
  return {
    id: "a1", jenis: "kredit", tanggal: "2026-06-10", jumlah: 1_000_000,
    kategori: "Faktur", sumber: "faktur", keterangan: "", proyekId: null,
    locked: false, isCancelled: false,
    ...overrides,
  };
}

describe("computeMonthlySummary", () => {
  it("sums income/expense and net saldo within the period only", () => {
    const entries = [
      mk({ id: "a1", jenis: "kredit", jumlah: 10_000_000, tanggal: "2026-06-05" }),
      mk({ id: "a2", jenis: "debit", jumlah: 4_000_000, tanggal: "2026-06-10" }),
      mk({ id: "a3", jenis: "kredit", jumlah: 5_000_000, tanggal: "2026-07-01" }), // out of period
    ];
    const summary = computeMonthlySummary(entries, juni);
    expect(summary.totalPemasukan).toBe(10_000_000);
    expect(summary.totalPengeluaran).toBe(4_000_000);
    expect(summary.saldoAkhir).toBe(6_000_000);
  });

  it("excludes cancelled entries", () => {
    const entries = [mk({ jenis: "kredit", jumlah: 10_000_000, isCancelled: true })];
    const summary = computeMonthlySummary(entries, juni);
    expect(summary.totalPemasukan).toBe(0);
  });

  it("builds a sorted saldoPerBulan series", () => {
    const entries = [
      mk({ id: "a1", jenis: "kredit", jumlah: 5_000_000, tanggal: "2026-06-01" }),
      mk({ id: "a2", jenis: "debit", jumlah: 2_000_000, tanggal: "2026-06-15" }),
    ];
    const summary = computeMonthlySummary(entries, { mulai: "2026-01-01", selesai: "2026-12-31" });
    expect(summary.saldoPerBulan).toEqual([{ bulan: "2026-06", saldo: 3_000_000 }]);
  });
});

describe("groupByKategori", () => {
  it("sums by category and sorts descending", () => {
    const entries = [
      mk({ id: "a1", kategori: "Faktur", jumlah: 5_000_000 }),
      mk({ id: "a2", kategori: "Bonus", jumlah: 10_000_000 }),
      mk({ id: "a3", kategori: "Faktur", jumlah: 1_000_000 }),
    ];
    const result = groupByKategori(entries, "kredit");
    expect(result).toEqual([
      { kategori: "Bonus", jumlah: 10_000_000 },
      { kategori: "Faktur", jumlah: 6_000_000 },
    ]);
  });

  it("buckets everything past the top 5 into Lainnya", () => {
    const entries = Array.from({ length: 7 }, (_, i) =>
      mk({ id: `a${i}`, kategori: `Kat${i}`, jumlah: (7 - i) * 1_000_000 }));
    const result = groupByKategori(entries, "kredit");
    expect(result).toHaveLength(6);
    expect(result[5]).toEqual({ kategori: "Lainnya", jumlah: 1_000_000 + 2_000_000 });
  });

  it("filters by jenis and excludes cancelled entries", () => {
    const entries = [
      mk({ id: "a1", jenis: "debit", kategori: "Sewa", jumlah: 2_000_000 }),
      mk({ id: "a2", jenis: "kredit", kategori: "Faktur", jumlah: 5_000_000, isCancelled: true }),
    ];
    expect(groupByKategori(entries, "kredit")).toEqual([]);
    expect(groupByKategori(entries, "debit")).toEqual([{ kategori: "Sewa", jumlah: 2_000_000 }]);
  });
});
