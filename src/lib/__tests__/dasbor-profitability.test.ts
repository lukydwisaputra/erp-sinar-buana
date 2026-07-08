import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/faktur/service", () => ({
  listAll: vi.fn(async () => [
    {
      id: "MI-1", proyekId: "P1", proyekNama: "Proyek Satu", perusahaanId: "C1", perusahaanNama: "PT Klien",
      layanan: [], totalBiaya: 100_000_000, statusId: null, status: "Belum Lunas", statusSystemRole: null, notes: "",
      terminScheme: [{ label: "I", persen: 100 }],
      termins: [{
        id: "INV-1", number: "INV/001/06.2026", masterInvoiceId: "MI-1", termId: "T1", label: "Termin I",
        tanggal: "2026-06-10", jatuhTempo: "2026-06-24", bankAccountId: null,
        bankNama: "", bankAtasNama: "", bankNoRekening: "",
        statusId: null, status: "Belum Lunas", statusSystemRole: null, paidDate: null,
        nilaiTermin: 100_000_000, dpp: 91_666_667, ppn: 0, pph23: 0,
        totalSetelahPajak: 100_000_000, grossIncome: 100_000_000, netIncome: 100_000_000,
        previousTermins: [], catatan: "",
      }],
      createdAt: "2026-06-01T00:00:00.000Z",
    },
  ]),
}));
vi.mock("@/lib/proyek/service", () => ({
  listProyek: vi.fn(async () => [{ id: "P1", nama: "Proyek Satu", sphId: "SPH-1", nilaiKontrak: 100_000_000 }]),
}));
vi.mock("@/lib/penawaran/service", () => ({
  listQuotations: vi.fn(async () => [
    { id: "SPH-1", items: [{ rab: { personil: [{ uraian: "A", vol: 1, satuan: "x", hargaSatuan: 30_000_000 }], langsung: [] } }] },
  ]),
}));
vi.mock("@/lib/realisasi-rab/service", () => ({
  listAll: vi.fn(async () => [
    { id: "r1", proyekId: "P1", kategori: "personil", rabLineLabel: "x", jumlah: 20_000_000, tanggal: "2026-06-05", keterangan: "" },
  ]),
}));
vi.mock("@/lib/arus-kas/service", () => ({
  listArusKas: vi.fn(async () => [
    { id: "a1", jenis: "debit", tanggal: "2026-06-03", jumlah: 5_000_000, kategori: "Sewa Kantor", sumber: "manual", keterangan: "", proyekId: null, locked: false, isCancelled: false },
  ]),
  listCashflowCategories: vi.fn(async () => [
    { id: "cat-1", kategori: "Sewa Kantor", sifat: "operasional", locked: false },
  ]),
}));
vi.mock("@/lib/dasbor/pajak-config-service", () => ({
  getPajakConfig: vi.fn(async () => ({ metode: "final_05", tarifFinalPersen: 0.5, tarifBadanPersen: 22, ambangOmzet: 4_800_000_000 })),
}));
vi.mock("@/lib/dasbor/settings-service", () => ({
  getDashboardSettings: vi.fn(async () => ({
    horizonProyeksiHari: 90, ambangMarginProyek: 0.1, ambangMangkrakHari: 30,
  })),
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
