import { describe, it, expect } from "vitest";
import { hppPeriode, bebanOperasionalPeriode, computeLabaRugi } from "@/lib/dasbor/profit-loss";
import type { Faktur } from "@/lib/schemas/faktur";
import type { RealisasiRab } from "@/lib/schemas/realisasi-rab";
import type { ArusKasEntry } from "@/lib/schemas/arus-kas";
import type { SifatBeban } from "@/lib/schemas/expense-nature";
import type { PajakConfig } from "@/lib/schemas/pajak-config";

const juni = { mulai: "2026-06-01", selesai: "2026-06-30" };
const finalCfg: PajakConfig = { metode: "final_05", tarifFinalPersen: 0.5, tarifBadanPersen: 22, ambangOmzet: 4_800_000_000 };

function mkFaktur(p: Partial<Faktur>): Faktur {
  return {
    sphId: "SPH-1", perusahaanId: "C1", perusahaanNama: "PT A", alamat: "", kota: "", npwp: "",
    tanggal: "2026-06-10", jatuhTempo: "2026-07-10",
    items: [{ uraian: "Jasa", volume: 1, harga: 100_000_000, satuan: "ls" }],
    terminList: [{ label: "Termin I", persen: 100, pemicu: "" }],
    terminIndex: 0, ppnAktif: false, ppnPersen: 11, pph23Aktif: false, pph23Persen: 2,
    catatan: [], status: "terkirim", tanggalBayar: "",
    bankNama: "", bankAtasNama: "", bankNoRekening: "",
    jabatanPenerima: "Direktur", picAktif: false, picNama: "", picJabatan: "", id: "INV/1-T1",
    ...p,
  } as Faktur;
}
const rr = (jumlah: number, tanggal: string): RealisasiRab => ({
  id: "RRB-1", proyekId: "P1", kategori: "personil", rabLineLabel: "x", jumlah, tanggal, keterangan: "",
});
const ak = (jumlah: number, kategori: string, tanggal: string): ArusKasEntry => ({
  id: "AKS-1", jenis: "debit", tanggal, jumlah, kategori, sumber: "manual", keterangan: "", locked: false,
});
// All categories Opex except "pajak" which is non-P&L.
const natureOf = (k: string): SifatBeban => (k === "pajak" ? "non_laba_rugi" : "operasional");

describe("hppPeriode", () => {
  it("sums realisasi RAB within the period only", () => {
    expect(hppPeriode([rr(10_000_000, "2026-06-05"), rr(5_000_000, "2026-05-30")], juni)).toBe(10_000_000);
  });
});

describe("bebanOperasionalPeriode", () => {
  it("sums only Opex-flagged categories in period; excludes non-P&L", () => {
    const rows = [ak(3_000_000, "Sewa Kantor", "2026-06-03"), ak(9_000_000, "pajak", "2026-06-04")];
    expect(bebanOperasionalPeriode(rows, natureOf, juni)).toBe(3_000_000);
  });

  it("excludes hpp-flagged categories (BR-14: HPP is COGS, not Opex)", () => {
    const natureOfHpp = (): SifatBeban => "hpp";
    const rows = [ak(5_000_000, "Bahan", "2026-06-10")];
    expect(bebanOperasionalPeriode(rows, natureOfHpp, juni)).toBe(0);
  });
});

describe("computeLabaRugi", () => {
  it("builds the full waterfall with margins", () => {
    const result = computeLabaRugi({
      fakturs: [mkFaktur({})], // revenue 100jt
      realisasi: [rr(40_000_000, "2026-06-05")], // HPP 40jt
      arusKas: [ak(10_000_000, "Sewa Kantor", "2026-06-03")], // Opex 10jt
      natureOf, config: finalCfg, periode: juni,
    });
    expect(result.pendapatan).toBe(100_000_000);
    expect(result.hpp).toBe(40_000_000);
    expect(result.labaKotor).toBe(60_000_000);
    expect(result.marginKotorPersen).toBeCloseTo(60);
    expect(result.bebanOperasional).toBe(10_000_000);
    expect(result.labaOperasional).toBe(50_000_000);
    expect(result.pphBadan).toBe(500_000); // 0.5% of 100jt
    expect(result.pphBadanEstimasi).toBe(true);
    expect(result.labaBersih).toBe(49_500_000);
    expect(result.marginBersihPersen).toBeCloseTo(49.5);
    expect(result.adaPendapatanTanpaBiaya).toBe(false);
  });

  it("flags revenue with no recorded cost (margin not a true 100%)", () => {
    const result = computeLabaRugi({
      fakturs: [mkFaktur({})], realisasi: [], arusKas: [], natureOf, config: finalCfg, periode: juni,
    });
    expect(result.adaPendapatanTanpaBiaya).toBe(true);
    expect(result.labaKotor).toBe(100_000_000);
  });

  it("zero revenue yields zero margins, not NaN", () => {
    const result = computeLabaRugi({
      fakturs: [], realisasi: [], arusKas: [], natureOf, config: finalCfg, periode: juni,
    });
    expect(result.marginKotorPersen).toBe(0);
    expect(result.marginBersihPersen).toBe(0);
  });
});
