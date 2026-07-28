import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/faktur/service", () => ({
  listAll: vi.fn(async () => []),
}));
vi.mock("@/lib/tax/service", () => ({
  listTaxEntries: vi.fn(async () => [
    { id: "K1", taxType: "ppn_keluaran", nature: "kewajiban", taxPeriod: "2020-01-01", jumlah: 5_000_000,
      dueDate: "2020-01-30", settlementStatus: "belum_disetor", settledDate: null,
      buktiPotongReceived: true, notes: "", companyId: null, employeeId: null },
  ]),
}));
vi.mock("@/lib/proyek/service", () => ({
  listProyek: vi.fn(async () => []),
}));
vi.mock("@/lib/penawaran/service", () => ({
  listQuotations: vi.fn(async () => []),
}));
vi.mock("@/lib/realisasi-rab/service", () => ({
  listAll: vi.fn(async () => []),
}));
vi.mock("@/lib/dasbor/settings-service", () => ({
  getDashboardSettings: vi.fn(async () => ({
    horizonProyeksiHari: 90, ambangMarginProyek: 0.1, ambangMangkrakHari: 30,
  })),
}));

import { getAlerts } from "@/lib/dasbor/alert-view";

describe("getAlerts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns alert items sorted by priority (finance caller)", async () => {
    const alerts = await getAlerts("test-user-id", true);
    // K1 overdue → pajak_terlambat, tinggi
    expect(alerts).toHaveLength(1);
    expect(alerts[0].prioritas).toBe("tinggi");
    expect(alerts[0].jenis).toBe("pajak_terlambat");
    expect(alerts[0].refId).toBe("K1");
  });

  it("drops finance-only alert kinds for non-finance callers", async () => {
    const alerts = await getAlerts("test-user-id", false);
    expect(alerts).toHaveLength(0);
  });
});
