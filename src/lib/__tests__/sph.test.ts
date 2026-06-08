import { describe, it, expect } from "vitest";
import {
  totalPenawaran,
  rabTotalOf,
  totalRab,
  margin,
  terminPersenTotal,
  isTerminValid,
} from "@/lib/sph";

const rabA = {
  personil: [{ vol: 2, hargaSatuan: 20_000_000 }], // 40jt
  langsung: [{ vol: 1, hargaSatuan: 20_000_000 }], // 20jt
}; // total 60jt
const rabB = {
  personil: [{ vol: 1, hargaSatuan: 20_000_000 }], // 20jt
  langsung: [{ vol: 1, hargaSatuan: 5_000_000 }], //  5jt
}; // total 25jt

const items = [
  { layananId: "LYN-001", nama: "A", volume: 2, harga: 75_000_000, rab: rabA },
  { layananId: "LYN-003", nama: "B", volume: 1, harga: 45_000_000, rab: rabB },
];

describe("totalPenawaran", () => {
  it("sums volume × harga", () => { expect(totalPenawaran(items)).toBe(195_000_000); });
  it("is 0 for no items", () => { expect(totalPenawaran([])).toBe(0); });
});

describe("rabTotalOf", () => {
  it("sums personil + langsung rows (vol × hargaSatuan)", () => {
    expect(rabTotalOf(rabA)).toBe(60_000_000);
    expect(rabTotalOf(rabB)).toBe(25_000_000);
  });
  it("is 0 for empty rows", () => {
    expect(rabTotalOf({ personil: [], langsung: [] })).toBe(0);
  });
});

describe("totalRab / margin", () => {
  it("totalRab sums each item's rab", () => {
    expect(totalRab(items)).toBe(85_000_000);
  });
  it("margin = penawaran − rab", () => {
    expect(margin(items)).toBe(110_000_000); // 195jt − 85jt
  });
  it("margin can be negative", () => {
    expect(
      margin([
        {
          layananId: "x",
          nama: "x",
          volume: 1,
          harga: 10,
          rab: { personil: [{ vol: 1, hargaSatuan: 100 }], langsung: [] },
        },
      ]),
    ).toBe(-90);
  });
});

describe("termin", () => {
  const t = [{ label: "I", persen: 40, pemicu: "Mulai" }, { label: "II", persen: 60, pemicu: "Selesai" }];
  it("sums percentages", () => { expect(terminPersenTotal(t)).toBe(100); });
  it("valid when sum is 100", () => { expect(isTerminValid(t)).toBe(true); });
  it("invalid otherwise", () => { expect(isTerminValid([{ label: "I", persen: 50, pemicu: "" }])).toBe(false); });
});
