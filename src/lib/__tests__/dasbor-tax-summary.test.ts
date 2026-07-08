import { describe, it, expect } from "vitest";
import { computeTaxSummary } from "@/lib/dasbor/tax-summary";
import type { TaxEntry } from "@/lib/schemas/tax-entries";

const TODAY = "2026-06-22";

function mk(overrides: Partial<TaxEntry>): TaxEntry {
  return {
    id: "k1", taxType: "ppn_keluaran", nature: "kewajiban", taxPeriod: "2026-05-01",
    jumlah: 1_000_000, dueDate: "2026-06-10", settlementStatus: "belum_disetor",
    settledDate: null, ntpn: null, buktiPotongReceived: true, notes: "",
    companyId: null, employeeId: null,
    ...overrides,
  };
}

describe("computeTaxSummary", () => {
  it("sums only outstanding (not sudah_disetor) liabilities", () => {
    const kewajiban = [
      mk({ id: "k1", jumlah: 5_000_000 }),
      mk({ id: "k2", jumlah: 3_000_000, settlementStatus: "sudah_disetor" }),
    ];
    expect(computeTaxSummary(kewajiban, TODAY).belumDisetor).toBe(5_000_000);
  });

  it("counts overdue entries (dueDate before today) among the outstanding", () => {
    const kewajiban = [
      mk({ id: "k1", dueDate: "2026-06-10" }), // overdue
      mk({ id: "k2", dueDate: "2026-07-01" }), // not yet due
      mk({ id: "k3", dueDate: "2026-06-01", settlementStatus: "sudah_disetor" }), // settled, excluded
    ];
    expect(computeTaxSummary(kewajiban, TODAY).terlambatCount).toBe(1);
  });

  it("finds the nearest upcoming due date among outstanding entries", () => {
    const kewajiban = [
      mk({ id: "k1", dueDate: "2026-07-15" }),
      mk({ id: "k2", dueDate: "2026-06-30" }),
    ];
    expect(computeTaxSummary(kewajiban, TODAY).jatuhTempoTerdekat).toBe("2026-06-30");
  });

  it("returns null jatuhTempoTerdekat when nothing is outstanding", () => {
    const kewajiban = [mk({ settlementStatus: "sudah_disetor" })];
    expect(computeTaxSummary(kewajiban, TODAY).jatuhTempoTerdekat).toBeNull();
  });

  it("sums pph23_dipotong credit entries regardless of settlement status", () => {
    const kewajiban = [
      mk({ id: "k1", taxType: "pph23_dipotong", nature: "kredit", jumlah: 2_000_000, settlementStatus: "sudah_disetor" }),
      mk({ id: "k2", taxType: "ppn_keluaran", nature: "kewajiban", jumlah: 9_000_000 }),
    ];
    expect(computeTaxSummary(kewajiban, TODAY).pph23KreditTerkumpul).toBe(2_000_000);
  });
});
