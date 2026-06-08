import { describe, it, expect } from "vitest";
import { totalPenawaran, totalRab, margin, terminPersenTotal, isTerminValid } from "@/lib/sph";

const items = [
  { layananId: "LYN-001", nama: "A", volume: 2, harga: 75_000_000 },
  { layananId: "LYN-003", nama: "B", volume: 1, harga: 45_000_000 },
];

describe("totalPenawaran", () => {
  it("sums volume × harga", () => { expect(totalPenawaran(items)).toBe(195_000_000); });
  it("is 0 for no items", () => { expect(totalPenawaran([])).toBe(0); });
});

describe("totalRab / margin", () => {
  it("totalRab sums personil + langsung", () => {
    expect(totalRab({ personil: 50_000_000, langsung: 30_000_000 })).toBe(80_000_000);
  });
  it("margin = penawaran − rab", () => {
    expect(margin(items, { personil: 50_000_000, langsung: 30_000_000 })).toBe(115_000_000);
  });
  it("margin can be negative", () => {
    expect(margin([{ layananId: "x", nama: "x", volume: 1, harga: 10 }], { personil: 100, langsung: 0 })).toBe(-90);
  });
});

describe("termin", () => {
  const t = [{ label: "I", persen: 40, pemicu: "Mulai" }, { label: "II", persen: 60, pemicu: "Selesai" }];
  it("sums percentages", () => { expect(terminPersenTotal(t)).toBe(100); });
  it("valid when sum is 100", () => { expect(isTerminValid(t)).toBe(true); });
  it("invalid otherwise", () => { expect(isTerminValid([{ label: "I", persen: 50, pemicu: "" }])).toBe(false); });
});
