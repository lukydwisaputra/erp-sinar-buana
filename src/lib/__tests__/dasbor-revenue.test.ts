import { describe, it, expect } from "vitest";
import {
  fakturDiterbitkan,
  pendapatanPeriode,
  pendapatanPerProyek,
  pph23KreditPeriode,
} from "@/lib/dasbor/revenue";
import type { FakturTerminRow } from "@/lib/faktur/mapping";

// Minimal termin factory — only fields the engine reads.
function mk(partial: Partial<FakturTerminRow>): FakturTerminRow {
  return {
    id: "INV-1", indukId: "MI-1", proyekId: "P1", perusahaanNama: "PT A",
    tanggal: "2026-06-10", jatuhTempo: "2026-07-10", statusSystemRole: null,
    nilaiTermin: 100_000_000, pph23: 2_000_000, netIncome: 98_000_000, totalSetelahPajak: 109_000_000,
    ...partial,
  };
}

const juni = { mulai: "2026-06-01", selesai: "2026-06-30" };

describe("fakturDiterbitkan", () => {
  it("treats unpaid and lunas termins as issued", () => {
    expect(fakturDiterbitkan(mk({ statusSystemRole: null }))).toBe(true);
    expect(fakturDiterbitkan(mk({ statusSystemRole: "LUNAS" }))).toBe(true);
  });
  it("treats cancelled termins as not issued", () => {
    expect(fakturDiterbitkan(mk({ statusSystemRole: "BATAL" }))).toBe(false);
  });
});

describe("pendapatanPeriode", () => {
  it("sums nilaiTermin (ex-PPN, pre-PPh23) of issued termins in period", () => {
    const rev = pendapatanPeriode([mk({ tanggal: "2026-06-10" })], juni);
    expect(rev).toBe(100_000_000);
  });
  it("excludes cancelled and out-of-period termins", () => {
    const rev = pendapatanPeriode(
      [
        mk({ statusSystemRole: "BATAL", tanggal: "2026-06-05", id: "cancelled" }),
        mk({ tanggal: "2026-05-10", id: "may" }),
        mk({ statusSystemRole: "LUNAS", tanggal: "2026-06-15", id: "jun" }),
      ],
      juni,
    );
    expect(rev).toBe(100_000_000); // only the June one
  });
  it("does NOT subtract PPh 23 from revenue (BR-14)", () => {
    const withPph = pendapatanPeriode([mk({ pph23: 2_000_000 })], juni);
    const withoutPph = pendapatanPeriode([mk({ pph23: 0 })], juni);
    expect(withPph).toBe(100_000_000);
    expect(withPph).toBe(withoutPph); // PPh 23 flag must not affect revenue
  });
});

describe("pendapatanPerProyek", () => {
  it("groups recognized revenue by proyekId across periods", () => {
    const map = pendapatanPerProyek([
      mk({ proyekId: "P1", statusSystemRole: "LUNAS", tanggal: "2026-01-10", id: "a" }),
      mk({ proyekId: "P1", statusSystemRole: null, tanggal: "2026-06-10", id: "b" }),
      mk({ proyekId: "P2", statusSystemRole: "LUNAS", tanggal: "2026-06-10", id: "c" }),
      mk({ proyekId: "P2", statusSystemRole: "BATAL", tanggal: "2026-06-11", id: "d" }),
    ]);
    expect(map.get("P1")).toBe(200_000_000);
    expect(map.get("P2")).toBe(100_000_000);
  });
});

describe("pph23KreditPeriode", () => {
  it("sums pph23 of issued termins in period", () => {
    const credit = pph23KreditPeriode([mk({ pph23: 2_000_000 })], juni);
    expect(credit).toBe(2_000_000);
  });
});
