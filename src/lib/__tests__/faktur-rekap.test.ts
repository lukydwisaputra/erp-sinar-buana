import { describe, it, expect } from "vitest";
import { groupFakturByDeal } from "@/lib/faktur";
import { fakturFixtures } from "@/lib/fixtures/faktur";

describe("groupFakturByDeal", () => {
  it("groups deal SPH/001 into 3 termins, lunas/lunas/menunggu, 80% paid", () => {
    const d = groupFakturByDeal(fakturFixtures).find((g) => g.sphId === "SPH/001/5.2026");
    expect(d).toBeTruthy();
    expect(d!.termins.length).toBe(3);
    expect(d!.termins.map((t) => t.status)).toEqual(["lunas", "lunas", "menunggu"]);
    expect(d!.terbayar).toBe(100_000_000);
    expect(d!.totalBiaya).toBe(125_000_000);
    expect(Math.round(d!.persenTerbayar)).toBe(80);
  });

  it("marks a termin without an invoice as 'belum'", () => {
    // SPH/002 only has Termin I (draft); Termin II has no invoice yet.
    const d = groupFakturByDeal(fakturFixtures).find((g) => g.sphId === "SPH/002/5.2026");
    expect(d!.termins.map((t) => t.status)).toEqual(["draft", "belum"]);
  });
});
