import { describe, it, expect } from "vitest";
import { computeFaktur, toRoman } from "@/lib/faktur";
import type { FakturFormValues } from "@/lib/schemas/faktur";

const base: FakturFormValues = {
  sphId: "", perusahaanId: "P1", perusahaanNama: "PT Pratama Abadi Industri (JX2)",
  alamat: "", kota: "Garut", npwp: "",
  tanggal: "2026-05-19", jatuhTempo: "2026-06-19",
  items: [{ uraian: "Penyusunan Persetujuan Teknis Air Limbah", volume: 1, harga: 125_000_000, satuan: "Paket" }],
  terminList: [
    { label: "Termin I", persen: 40, pemicu: "DP" },
    { label: "Termin II", persen: 40, pemicu: "Progres" },
    { label: "Termin III", persen: 20, pemicu: "Pelunasan Persetujuan Teknis Air Limbah" },
  ],
  terminIndex: 2,
  ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2,
  catatan: [], status: "terkirim", tanggalBayar: "",
  bankNama: "", bankAtasNama: "", bankNoRekening: "",
  jabatanPenerima: "Direktur", picAktif: false, picNama: "", picJabatan: "",
};

describe("computeFaktur", () => {
  it("reproduces the SBMJ Termin III invoice totals", () => {
    const r = computeFaktur(base);
    expect(r.totalBiaya).toBe(125_000_000);
    expect(r.previous.map((p) => p.amount)).toEqual([50_000_000, 50_000_000]);
    expect(r.nilaiTermin).toBe(25_000_000);
    expect(Math.round(r.dpp)).toBe(22_916_667); // 11/12 × 25jt
    expect(r.ppn).toBe(2_750_000); // 12% × dpp = 11% × 25jt
    expect(r.pph23).toBe(500_000); // 2% × 25jt
    expect(r.total).toBe(27_250_000); // 25jt + ppn − pph
  });

  it("drops taxes when toggled off", () => {
    const r = computeFaktur({ ...base, ppnAktif: false, pph23Aktif: false });
    expect(r.ppn).toBe(0);
    expect(r.pph23).toBe(0);
    expect(r.total).toBe(25_000_000);
  });
});

describe("toRoman", () => {
  it("converts 1..4", () => {
    expect([1, 2, 3, 4].map(toRoman)).toEqual(["I", "II", "III", "IV"]);
  });
});
