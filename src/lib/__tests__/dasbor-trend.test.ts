import { describe, it, expect } from "vitest";
import { computeMonthlyTrend } from "@/lib/dasbor/trend";
import type { FakturTerminRow } from "@/lib/faktur/mapping";
import type { RealisasiRab } from "@/lib/schemas/realisasi-rab";
import type { ArusKasEntry } from "@/lib/schemas/arus-kas";
import type { PajakConfig } from "@/lib/schemas/pajak-config";

const config: PajakConfig = { metode: "final_05", tarifFinalPersen: 0.5, tarifBadanPersen: 22, ambangOmzet: 4_800_000_000 };
const natureOf = () => "operasional" as const;

function faktur(overrides: Partial<FakturTerminRow>): FakturTerminRow {
  return {
    id: "t1", indukId: "mi1", proyekId: "p1", perusahaanNama: "PT A",
    tanggal: "2026-06-10", jatuhTempo: "2026-07-10", statusSystemRole: "LUNAS",
    nilaiTermin: 10_000_000, pph23: 0, netIncome: 10_000_000, totalSetelahPajak: 10_000_000,
    ...overrides,
  };
}

function kas(overrides: Partial<ArusKasEntry>): ArusKasEntry {
  return {
    id: "a1", jenis: "kredit", tanggal: "2026-06-10", jumlah: 10_000_000,
    kategori: "Faktur", sumber: "faktur", keterangan: "", proyekId: null,
    locked: false, isCancelled: false,
    ...overrides,
  };
}

describe("computeMonthlyTrend", () => {
  it("returns `months` trailing points, ending on today's month", () => {
    const points = computeMonthlyTrend({
      fakturs: [], realisasi: [], arusKas: [], natureOf, config, today: "2026-06-15", months: 3,
    });
    expect(points.map((p) => p.bulan)).toEqual(["2026-04", "2026-05", "2026-06"]);
  });

  it("computes pendapatan/laba per month from computeLabaRugi", () => {
    const fakturs = [faktur({ tanggal: "2026-06-05", nilaiTermin: 20_000_000 })];
    const points = computeMonthlyTrend({
      fakturs, realisasi: [] as RealisasiRab[], arusKas: [], natureOf, config, today: "2026-06-15", months: 2,
    });
    const juni = points.find((p) => p.bulan === "2026-06")!;
    const mei = points.find((p) => p.bulan === "2026-05")!;
    expect(juni.pendapatan).toBe(20_000_000);
    expect(mei.pendapatan).toBe(0);
  });

  it("computes a cumulative kas balance up to end of each month", () => {
    const arusKas = [
      kas({ id: "a1", jenis: "kredit", jumlah: 10_000_000, tanggal: "2026-05-10" }),
      kas({ id: "a2", jenis: "debit", jumlah: 4_000_000, tanggal: "2026-06-05" }),
    ];
    const points = computeMonthlyTrend({
      fakturs: [], realisasi: [], arusKas, natureOf, config, today: "2026-06-15", months: 2,
    });
    const mei = points.find((p) => p.bulan === "2026-05")!;
    const juni = points.find((p) => p.bulan === "2026-06")!;
    expect(mei.kas).toBe(10_000_000);
    expect(juni.kas).toBe(6_000_000); // cumulative, includes May's entry too
  });

  it("excludes cancelled cashflow entries from the kas balance", () => {
    const arusKas = [kas({ jenis: "kredit", jumlah: 10_000_000, isCancelled: true })];
    const points = computeMonthlyTrend({
      fakturs: [], realisasi: [], arusKas, natureOf, config, today: "2026-06-15", months: 1,
    });
    expect(points[0].kas).toBe(0);
  });
});
