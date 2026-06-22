import { describe, it, expect } from "vitest";
import { estimasiPphBadan } from "@/lib/dasbor/income-tax";
import type { PajakConfig } from "@/lib/schemas/pajak-config";

const final: PajakConfig = { metode: "final_05", tarifFinalPersen: 0.5, tarifBadanPersen: 22, ambangOmzet: 4_800_000_000 };
const badan: PajakConfig = { metode: "badan_22", tarifFinalPersen: 0.5, tarifBadanPersen: 22, ambangOmzet: 4_800_000_000 };

describe("estimasiPphBadan", () => {
  it("final method: 0.5% of revenue, ignores profit", () => {
    const tax = estimasiPphBadan({ config: final, pendapatan: 100_000_000, labaOperasional: 30_000_000, pph23Kredit: 0 });
    expect(tax).toBe(500_000);
  });

  it("badan method: 22% of operating profit, minus PPh 23 credit", () => {
    const tax = estimasiPphBadan({ config: badan, pendapatan: 100_000_000, labaOperasional: 30_000_000, pph23Kredit: 2_000_000 });
    expect(tax).toBe(22 / 100 * 30_000_000 - 2_000_000); // 6.6jt - 2jt = 4.6jt
  });

  it("badan method: floors at 0 when credit exceeds tax", () => {
    const tax = estimasiPphBadan({ config: badan, pendapatan: 10_000_000, labaOperasional: 1_000_000, pph23Kredit: 5_000_000 });
    expect(tax).toBe(0);
  });

  it("badan method: zero tax on a loss", () => {
    const tax = estimasiPphBadan({ config: badan, pendapatan: 100_000_000, labaOperasional: -5_000_000, pph23Kredit: 0 });
    expect(tax).toBe(0);
  });
});
