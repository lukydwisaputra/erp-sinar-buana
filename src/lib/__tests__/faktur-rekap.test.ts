import { describe, it, expect } from "vitest";
import { groupFakturByDeal } from "@/lib/faktur";
import { fakturFixtures } from "@/lib/fixtures/faktur";

describe("groupFakturByDeal", () => {
  it("derives termin statuses + 70% paid for deal SPH/001", () => {
    const d = groupFakturByDeal(fakturFixtures).find((g) => g.sphId === "SPH/001/5.2026")!;
    expect(d.termins.map((t) => t.status)).toEqual(["lunas", "lunas", "menunggu"]);
    expect(d.terbayar).toBe(87_500_000);
    expect(d.totalBiaya).toBe(125_000_000);
    expect(Math.round(d.persenTerbayar)).toBe(70);
  });

  it("unlocks the next termin only after the previous is paid (sequential)", () => {
    const deals = groupFakturByDeal(fakturFixtures);

    // Deal B: Termin I lunas → Termin II (belum) is unlocked.
    const b = deals.find((g) => g.sphId === "SPH/002/5.2026")!;
    expect(b.termins[1].status).toBe("belum");
    expect(b.termins[1].canCreate).toBe(true);

    // Deal C: Termin I terkirim (overdue, not paid) → Termin II stays locked.
    const c = deals.find((g) => g.sphId === "SPH/004/6.2026")!;
    expect(c.termins[0].overdue).toBe(true);
    expect(c.termins[1].canCreate).toBe(false);
  });
});
