import { describe, it, expect } from "vitest";
import { toOptionItem, extraToColumns } from "@/lib/daftar-pilihan/mapping";

const base = {
  id: "opt-1",
  label: "Contoh",
  isActive: true,
  sortOrder: 1,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("toOptionItem", () => {
  it("maps a plain lookup row (e.g. jenis_dokumen) with an empty extra", () => {
    const result = toOptionItem("jenis_dokumen", base);
    expect(result).toMatchObject({ id: "opt-1", kategori: "jenis_dokumen", nama: "Contoh", urutan: 1, aktif: true, locked: false, extra: {} });
  });

  it("resolves status_kepegawaian's multiplier into extra.pengali", () => {
    const result = toOptionItem("status_kepegawaian", { ...base, multiplier: "0.8000" });
    expect(result.extra.pengali).toBe(0.8);
  });

  it("resolves komponen_gaji's kind/calc_type/default_value/is_employer_portion", () => {
    const result = toOptionItem("komponen_gaji", {
      ...base, kind: "potongan", calcType: "persentase", defaultValue: "2.5000", isEmployerPortion: true,
    });
    expect(result.extra).toEqual({ kind: "potongan", calcMethod: "persentase", defaultValue: 2.5, isEmployerPortion: true });
  });

  it("resolves rekening_bank's bank fields + isDefault", () => {
    const result = toOptionItem("rekening_bank", {
      ...base, bankName: "BNI", accountHolder: "PT SBMJ", accountNumber: "0559332815", isDefault: true,
    });
    expect(result.extra).toEqual({
      bank: { nama: "BNI", atasNama: "PT SBMJ", nomor: "0559332815" },
      isDefault: true,
    });
  });
});

describe("extraToColumns", () => {
  it("returns an empty object for plain categories", () => {
    expect(extraToColumns("jabatan", {})).toEqual({});
  });

  it("converts pengali to a stringified multiplier column", () => {
    expect(extraToColumns("status_kepegawaian", { pengali: 0.8 })).toEqual({ multiplier: "0.8" });
  });

  it("converts komponen_gaji extra fields to their column names", () => {
    expect(
      extraToColumns("komponen_gaji", { kind: "tunjangan", calcMethod: "nominal", defaultValue: 50000, isEmployerPortion: false }),
    ).toEqual({ kind: "tunjangan", calcType: "nominal", defaultValue: "50000", isEmployerPortion: false });
  });

  it("converts rekening_bank extra fields to their column names", () => {
    expect(
      extraToColumns("rekening_bank", { bank: { nama: "BCA", atasNama: "Budi", nomor: "123" }, isDefault: true }),
    ).toEqual({ bankName: "BCA", accountHolder: "Budi", accountNumber: "123", isDefault: true });
  });
});
