import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/data/faktur", () => ({
  listFaktur: vi.fn(async () => []),
}));
vi.mock("@/lib/data/kewajiban-pajak", () => ({
  listKewajibanPajak: vi.fn(async () => [
    { id: "K1", jenis: "ppn", periode: "2026-05", jumlah: 5_000_000,
      jatuhTempo: "2026-05-30", status: "belum_setor", buktiPotongDiterima: true, keterangan: "" },
  ]),
}));
vi.mock("@/lib/proyek/service", () => ({
  listProyek: vi.fn(async () => []),
}));
vi.mock("@/lib/data/penawaran", () => ({
  listPenawaran: vi.fn(async () => []),
}));
vi.mock("@/lib/realisasi-rab/service", () => ({
  listAll: vi.fn(async () => []),
}));

import { getAlerts } from "@/lib/dasbor/alert-view";

describe("getAlerts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns alert items sorted by priority", async () => {
    const alerts = await getAlerts("test-user-id");
    // K1 overdue → pajak_terlambat, tinggi
    expect(alerts).toHaveLength(1);
    expect(alerts[0].prioritas).toBe("tinggi");
    expect(alerts[0].jenis).toBe("pajak_terlambat");
    expect(alerts[0].refId).toBe("K1");
  });
});
