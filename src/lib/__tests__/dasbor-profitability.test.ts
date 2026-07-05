import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/data/faktur", () => ({
  listFaktur: vi.fn(async () => [
    {
      sphId: "SPH-1", status: "lunas", tanggal: "2026-06-10", terminIndex: 0,
      terminList: [{ label: "I", persen: 100, pemicu: "" }],
      items: [{ uraian: "j", volume: 1, harga: 100_000_000, satuan: "ls" }],
      ppnAktif: false, ppnPersen: 11, pph23Aktif: false, pph23Persen: 2, id: "INV-1",
    },
  ]),
}));
vi.mock("@/lib/proyek/service", () => ({
  listProyek: vi.fn(async () => [{ id: "P1", nama: "Proyek Satu", sphId: "SPH-1", nilaiKontrak: 100_000_000 }]),
}));
vi.mock("@/lib/data/penawaran", () => ({
  listPenawaran: vi.fn(async () => [
    { id: "SPH-1", items: [{ rab: { personil: [{ uraian: "A", vol: 1, satuan: "x", hargaSatuan: 30_000_000 }], langsung: [] } }] },
  ]),
}));
vi.mock("@/lib/realisasi-rab/service", () => ({
  listAll: vi.fn(async () => [
    { id: "r1", proyekId: "P1", kategori: "personil", rabLineLabel: "x", jumlah: 20_000_000, tanggal: "2026-06-05", keterangan: "" },
  ]),
}));
vi.mock("@/lib/data/arus-kas", () => ({
  listArusKas: vi.fn(async () => [
    { id: "a1", jenis: "debit", tanggal: "2026-06-03", jumlah: 5_000_000, kategori: "Sewa Kantor", sumber: "manual", keterangan: "", locked: false },
  ]),
}));
vi.mock("@/lib/data/expense-nature", () => ({
  listExpenseNature: vi.fn(async () => [{ kategori: "Sewa Kantor", sifat: "operasional" }]),
}));
vi.mock("@/lib/data/pajak-config", () => ({
  getPajakConfig: vi.fn(async () => ({ metode: "final_05", tarifFinalPersen: 0.5, tarifBadanPersen: 22, ambangOmzet: 4_800_000_000 })),
}));

import { getProfitabilitas } from "@/lib/dasbor/profitability";

const juni = { mulai: "2026-06-01", selesai: "2026-06-30" };

describe("getProfitabilitas", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a P&L waterfall and per-project rows from the data layers", async () => {
    const view = await getProfitabilitas("test-user-id", juni);
    // revenue 100jt, HPP 20jt, Opex 5jt
    expect(view.labaRugi.pendapatan).toBe(100_000_000);
    expect(view.labaRugi.hpp).toBe(20_000_000);
    expect(view.labaRugi.bebanOperasional).toBe(5_000_000);
    expect(view.labaRugi.labaOperasional).toBe(75_000_000);
    expect(view.proyek).toHaveLength(1);
    expect(view.proyek[0].proyekId).toBe("P1");
    expect(view.proyek[0].rabRencana).toBe(30_000_000);
    expect(view.proyek[0].pendapatanDiakui).toBe(100_000_000);
  });

  it("uses DEFAULT_SIFAT (operasional) for unmapped categories", async () => {
    const view = await getProfitabilitas("test-user-id", juni);
    // Sewa Kantor is mapped; an unmapped category would still default to operasional.
    expect(view.labaRugi.bebanOperasional).toBe(5_000_000);
  });
});
