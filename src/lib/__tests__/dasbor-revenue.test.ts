import { describe, it, expect } from "vitest";
import {
  fakturDiterbitkan,
  pendapatanPeriode,
  pendapatanPerSph,
  pph23KreditPeriode,
} from "@/lib/dasbor/revenue";
import type { Faktur } from "@/lib/schemas/faktur";

// Minimal faktur factory — only fields the engine reads.
function mk(partial: Partial<Faktur>): Faktur {
  return {
    sphId: "SPH-1", perusahaanId: "C1", perusahaanNama: "PT A", alamat: "", kota: "", npwp: "",
    tanggal: "2026-06-10", jatuhTempo: "2026-07-10",
    items: [{ uraian: "Jasa", volume: 1, harga: 100_000_000, satuan: "ls" }],
    terminList: [{ label: "Termin I", persen: 100, pemicu: "" }],
    terminIndex: 0,
    ppnAktif: true, ppnPersen: 11, pph23Aktif: true, pph23Persen: 2,
    catatan: [], status: "terkirim", tanggalBayar: "",
    bankNama: "", bankAtasNama: "", bankNoRekening: "",
    jabatanPenerima: "Direktur", picAktif: false, picNama: "", picJabatan: "",
    id: "INV/1-T1",
    ...partial,
  } as Faktur;
}

const juni = { mulai: "2026-06-01", selesai: "2026-06-30" };

describe("fakturDiterbitkan", () => {
  it("treats terkirim and lunas as issued", () => {
    expect(fakturDiterbitkan(mk({ status: "terkirim" }))).toBe(true);
    expect(fakturDiterbitkan(mk({ status: "lunas" }))).toBe(true);
  });
  it("treats draft and dibatalkan as not issued", () => {
    expect(fakturDiterbitkan(mk({ status: "draft" }))).toBe(false);
    expect(fakturDiterbitkan(mk({ status: "dibatalkan" }))).toBe(false);
  });
});

describe("pendapatanPeriode", () => {
  it("sums nilaiTermin (ex-PPN, pre-PPh23) of issued fakturs in period", () => {
    // single 100% termin of 100jt -> nilaiTermin = 100jt
    const rev = pendapatanPeriode([mk({ status: "terkirim", tanggal: "2026-06-10" })], juni);
    expect(rev).toBe(100_000_000);
  });
  it("excludes drafts and out-of-period fakturs", () => {
    const rev = pendapatanPeriode(
      [
        mk({ status: "draft", tanggal: "", id: "d" }),
        mk({ status: "terkirim", tanggal: "2026-05-10", id: "may" }),
        mk({ status: "lunas", tanggal: "2026-06-15", id: "jun" }),
      ],
      juni,
    );
    expect(rev).toBe(100_000_000); // only the June one
  });
  it("does NOT subtract PPh 23 from revenue (BR-14)", () => {
    const withPph = pendapatanPeriode([mk({ pph23Aktif: true, pph23Persen: 2 })], juni);
    const withoutPph = pendapatanPeriode([mk({ pph23Aktif: false, pph23Persen: 2 })], juni);
    expect(withPph).toBe(100_000_000);
    expect(withPph).toBe(withoutPph); // PPh 23 flag must not affect revenue
  });
});

describe("pendapatanPerSph", () => {
  it("groups recognized revenue by sphId across periods", () => {
    const map = pendapatanPerSph([
      mk({ sphId: "SPH-1", status: "lunas", tanggal: "2026-01-10", id: "a" }),
      mk({ sphId: "SPH-1", status: "terkirim", tanggal: "2026-06-10", id: "b" }),
      mk({ sphId: "SPH-2", status: "lunas", tanggal: "2026-06-10", id: "c" }),
      mk({ sphId: "SPH-2", status: "draft", tanggal: "", id: "d" }),
    ]);
    expect(map.get("SPH-1")).toBe(200_000_000);
    expect(map.get("SPH-2")).toBe(100_000_000);
  });
});

describe("pph23KreditPeriode", () => {
  it("sums pph23 of issued fakturs in period", () => {
    const credit = pph23KreditPeriode([mk({ pph23Aktif: true, pph23Persen: 2 })], juni);
    expect(credit).toBe(2_000_000); // 2% of 100jt nilaiTermin
  });
});
