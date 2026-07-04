import { describe, it, expect } from "vitest";
import { groupFakturByDeal } from "@/lib/faktur";
import { fakturFixtures } from "@/lib/fixtures/faktur";
import { encodeInvTermin } from "@/lib/id-generator";
import { seedSphId } from "@/lib/penawaran-seed-ids";

const SPH1 = seedSphId(1);
const SPH2 = seedSphId(2);
const SPH4 = seedSphId(4);
const INV1T3 = encodeInvTermin(1, 2026, 2);
const INV2T1 = encodeInvTermin(2, 2026, 0);

describe("groupFakturByDeal", () => {
  it("derives termin statuses + 70% paid for deal SPH1", () => {
    const d = groupFakturByDeal(fakturFixtures).find((g) => g.sphId === SPH1)!;
    expect(d.termins.map((t) => t.status)).toEqual(["lunas", "lunas", "menunggu"]);
    // terbayar now uses after-tax amounts (T1 + T2 lunas after-tax)
    expect(d.terbayar).toBe(95_375_000);
    expect(d.totalBiaya).toBe(125_000_000);
    expect(Math.round(d.persenTerbayar)).toBe(70);
  });

  it("unlocks the next termin only after the previous is paid (sequential)", () => {
    const deals = groupFakturByDeal(fakturFixtures);

    // Deal B: Termin I lunas → Termin II (draft, auto-created) is unlocked.
    const b = deals.find((g) => g.sphId === SPH2)!;
    expect(["belum", "draft"]).toContain(b.termins[1].status);
    expect(b.termins[1].canCreate).toBe(true);

    // Deal C: Termin I terkirim (overdue, not paid) → Termin II stays locked.
    const c = deals.find((g) => g.sphId === SPH4)!;
    expect(c.termins[0].overdue).toBe(true);
    expect(c.termins[1].canCreate).toBe(false);
  });
});

describe("groupFakturByDeal — after-tax", () => {
  it("terbayar is sum of after-tax amounts for lunas termins (deal A)", () => {
    const d = groupFakturByDeal(fakturFixtures).find((g) => g.sphId === SPH1)!;
    // T1: 40% of 125M = 50M; dpp=11/12*50M=45_833_333; ppn=round(12%*dpp)=5_500_000; pph=2%*50M=1_000_000 → 54_500_000
    // T2: 30% of 125M = 37.5M; dpp=34_375_000; ppn=4_125_000; pph=750_000 → 40_875_000
    expect(d.terbayar).toBe(95_375_000); // T1 + T2 lunas after-tax
    expect(d.totalAfterTax).toBe(136_250_000); // T1 + T2 + T3
    expect(Math.round(d.persenTerbayar)).toBe(70);
  });

  it("nilaiAfterTax per termin matches computeFaktur", () => {
    const d = groupFakturByDeal(fakturFixtures).find((g) => g.sphId === SPH1)!;
    expect(d.termins[0].nilaiAfterTax).toBe(54_500_000);
    expect(d.termins[1].nilaiAfterTax).toBe(40_875_000);
    expect(d.termins[2].nilaiAfterTax).toBe(40_875_000);
  });

  it("latestFaktur is the issued termin with highest terminIndex", () => {
    const d = groupFakturByDeal(fakturFixtures).find((g) => g.sphId === SPH1)!;
    expect(d.latestFaktur?.id).toBe(INV1T3);
  });

  it("deal B: T2 draft is locked while T1 lunas", () => {
    const b = groupFakturByDeal(fakturFixtures).find((g) => g.sphId === SPH2)!;
    expect(b.termins[1].status).toBe("draft");
    expect(b.latestFaktur?.id).toBe(INV2T1);
  });

  it("deal C: T1 overdue, T2 draft stays locked", () => {
    const c = groupFakturByDeal(fakturFixtures).find((g) => g.sphId === SPH4)!;
    expect(c.termins[0].overdue).toBe(true);
    expect(c.termins[1].status).toBe("draft");
  });

  it("draft termin nilaiAfterTax uses afterTaxAmount estimate", () => {
    // Deal B: total = 350M; T2 draft (50%) = 175M pre-tax
    // dpp = 11/12 * 175M = 160_416_666; ppn = round(12% * dpp) = 19_250_000; pph = 2% * 175M = 3_500_000
    // nilaiAfterTax = 175M + 19_250_000 - 3_500_000 = 190_750_000
    const b = groupFakturByDeal(fakturFixtures).find((g) => g.sphId === SPH2)!;
    expect(b.termins[1].nilaiAfterTax).toBe(190_750_000);
  });
});
