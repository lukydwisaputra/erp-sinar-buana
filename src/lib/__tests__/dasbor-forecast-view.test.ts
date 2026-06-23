import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/data/arus-kas", () => ({
  listArusKas: vi.fn(async () => [
    { id: "a1", jenis: "kredit", tanggal: "2026-06-01", jumlah: 100_000_000, kategori: "x", sumber: "manual", keterangan: "", locked: false },
  ]),
}));
vi.mock("@/lib/data/faktur", () => ({
  listFaktur: vi.fn(async () => []),
}));
vi.mock("@/lib/data/kewajiban-pajak", () => ({
  listKewajibanPajak: vi.fn(async () => []),
}));
vi.mock("@/lib/data/penggajian", () => ({
  listBatch: vi.fn(async () => []),
}));

import { getForekast } from "@/lib/dasbor/forecast-view";

describe("getForekast", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a ForecastView with saldoSaatIni from arus-kas", async () => {
    const view = await getForekast(90);
    expect(view.saldoSaatIni).toBe(100_000_000);
    expect(view.weeklyProjections.length).toBeGreaterThan(0);
    expect(view.monthlyObligation).toBe(0);
    expect(view.runwayBulan).toBeNull();
  });
});
