import { describe, it, expect } from "vitest";
import {
  saldoArusKas, forecastInflows, forecastOutflows,
  estimateMonthlyObligation, computeWeeklyProjections, computeForekast,
} from "@/lib/dasbor/forecast";
import type { ArusKasEntry } from "@/lib/schemas/arus-kas";
import type { FakturTerminRow } from "@/lib/faktur/mapping";
import type { TaxEntry } from "@/lib/schemas/tax-entries";
import type { PenggajianBatch } from "@/lib/schemas/penggajian";

const TODAY = "2026-06-22";

// Helpers
const ak = (jenis: "kredit" | "debit", jumlah: number): ArusKasEntry => ({
  id: "ak1", jenis, tanggal: "2026-06-01", jumlah, kategori: "test",
  sumber: "manual", keterangan: "", proyekId: null, locked: false, isCancelled: false,
});

const mkFaktur = (id: string, jatuhTempo: string, statusSystemRole: string | null = null): FakturTerminRow => ({
  id, proyekId: "P1", perusahaanNama: "PT Klien",
  tanggal: "2026-06-01", jatuhTempo, statusSystemRole,
  nilaiTermin: 100_000_000, pph23: 0, netIncome: 100_000_000, totalSetelahPajak: 100_000_000,
});

const mkKewajiban = (id: string, dueDate: string, settlementStatus: "belum_disetor" | "sudah_disetor" = "belum_disetor"): TaxEntry => ({
  id, taxType: "ppn_keluaran", nature: "kewajiban", taxPeriod: "2026-06-01", jumlah: 5_000_000,
  dueDate, settlementStatus, settledDate: null, ntpn: null, buktiPotongReceived: true, notes: "",
  companyId: null, employeeId: null,
});

const mkBatch = (id: string, netPerSlip: number): PenggajianBatch => ({
  id, periode: { mulai: "2026-06-01", selesai: "2026-06-30" },
  tanggalBayar: "2026-05-25",
  createdAt: "2026-06-22T00:00:00.000Z",
  slips: [{
    id: "s1", batchId: id, number: "GAJ/001/6.2026", karyawanId: "K1", karyawanNama: "Budi",
    jabatan: "Staff", statusKepegawaian: "Tetap",
    pengali: 1, gajiPokok: netPerSlip, components: [], lembur: 0, bonus: 0, pph21: 0,
    bankNama: "BCA", bankNomor: "123", bankAtasNama: "Budi", telepon: "", email: "",
    statusId: null, status: "sudah_dibayar", statusSystemRole: "DIBAYAR", paidAt: null,
  }],
});

describe("saldoArusKas", () => {
  it("returns kredit minus debit", () => {
    expect(saldoArusKas([ak("kredit", 100_000_000), ak("debit", 30_000_000)])).toBe(70_000_000);
  });
  it("returns 0 for empty", () => {
    expect(saldoArusKas([])).toBe(0);
  });
  it("excludes cancelled entries", () => {
    const cancelled: ArusKasEntry = { ...ak("kredit", 50_000_000), isCancelled: true };
    expect(saldoArusKas([ak("kredit", 100_000_000), cancelled])).toBe(100_000_000);
  });
});

describe("forecastInflows", () => {
  it("includes unpaid termins with jatuhTempo within horizon", () => {
    const fakturs = [
      mkFaktur("F1", "2026-06-25"),          // within 90 days
      mkFaktur("F2", "2026-10-01"),          // outside horizon (> today+90)
      mkFaktur("F3", "2026-06-10", "LUNAS"), // paid — exclude
      mkFaktur("F3b", "2026-06-25", "BATAL"),// cancelled — exclude
    ];
    const result = forecastInflows(fakturs, TODAY, 90);
    expect(result).toHaveLength(1);
    expect(result[0].refId).toBe("F1");
    expect(result[0].jenis).toBe("masuk");
    expect(result[0].jumlah).toBe(100_000_000); // netIncome, no pph23
  });

  it("includes invoice due exactly on today and on the last day of horizon", () => {
    const fakturs = [
      mkFaktur("F-today", TODAY),           // jatuhTempo == today
      mkFaktur("F-horizon", "2026-09-20"),  // jatuhTempo == today + 90
    ];
    const result = forecastInflows(fakturs, TODAY, 90);
    expect(result).toHaveLength(2);
    expect(result.map(e => e.refId).sort()).toEqual(["F-horizon", "F-today"]);
  });

  it("uses netIncome (already net of pph23)", () => {
    const f: FakturTerminRow = {
      ...mkFaktur("F4", "2026-06-25"),
      pph23: 2_000_000, netIncome: 98_000_000,
    };
    const result = forecastInflows([f], TODAY, 90);
    expect(result[0].jumlah).toBe(98_000_000);
  });
});

describe("forecastOutflows", () => {
  it("includes belum_disetor kewajiban within horizon", () => {
    const kewajiban = [
      mkKewajiban("K1", "2026-06-30"),                    // within horizon
      mkKewajiban("K2", "2026-10-30"),                    // outside horizon
      mkKewajiban("K3", "2026-06-30", "sudah_disetor"),    // already paid
    ];
    const result = forecastOutflows(kewajiban, [], TODAY, 90);
    expect(result).toHaveLength(1);
    expect(result[0].refId).toBe("K1");
    expect(result[0].jenis).toBe("keluar");
    expect(result[0].sumber).toBe("pajak");
  });

  it("includes next payroll projection when latest batch exists and within horizon", () => {
    const batch = mkBatch("B1", 10_000_000);
    const result = forecastOutflows([], [batch], TODAY, 90);
    // tanggalBayar="2026-05-25" (past) → nextOccurrence(day=25, today="2026-06-22") = "2026-06-25"
    expect(result).toHaveLength(1);
    expect(result[0].sumber).toBe("penggajian");
    expect(result[0].jenis).toBe("keluar");
    expect(result[0].jumlah).toBe(10_000_000);
  });

  it("projects payroll to next month when today is past the batch's pay day", () => {
    const batch = mkBatch("B1", 10_000_000);
    // tanggalBayar="2026-05-25" (past), today="2026-06-26" → nextOccurrence = "2026-07-25"
    const result = forecastOutflows([], [batch], "2026-06-26", 90);
    expect(result).toHaveLength(1);
    expect(result[0].tanggal).toBe("2026-07-25");
    expect(result[0].sumber).toBe("penggajian");
  });
});

describe("estimateMonthlyObligation", () => {
  it("returns latest batch total net payroll", () => {
    const batch = mkBatch("B1", 15_000_000);
    expect(estimateMonthlyObligation([batch])).toBe(15_000_000);
  });
  it("returns 0 for no batches", () => {
    expect(estimateMonthlyObligation([])).toBe(0);
  });
});

describe("computeWeeklyProjections", () => {
  it("accumulates entries per week", () => {
    const entries = [
      { tanggal: "2026-06-25", label: "X", jumlah: 10_000_000, jenis: "masuk" as const, sumber: "faktur" as const, refId: "F1" },
      { tanggal: "2026-07-02", label: "Y", jumlah: 5_000_000, jenis: "keluar" as const, sumber: "pajak" as const, refId: "K1" },
    ];
    const projections = computeWeeklyProjections(50_000_000, entries, TODAY, 14);
    // week 1 (Mon 22 Jun): +10jt → 60jt
    expect(projections[0].saldoAkhir).toBe(60_000_000);
    // week 2 (Mon 29 Jun): -5jt → 55jt
    expect(projections[1].saldoAkhir).toBe(55_000_000);
  });
});

describe("computeForekast", () => {
  it("integrates all sub-functions into a ForecastView", () => {
    const result = computeForekast({
      arusKas: [ak("kredit", 100_000_000), ak("debit", 30_000_000)],
      fakturs: [mkFaktur("F1", "2026-06-25")],
      kewajiban: [mkKewajiban("K1", "2026-06-30")],
      batches: [mkBatch("B1", 10_000_000)],
      today: TODAY,
      horizonDays: 90,
    });
    expect(result.saldoSaatIni).toBe(70_000_000);
    expect(result.entries.length).toBeGreaterThanOrEqual(3); // F1 + K1 + payroll
    expect(result.monthlyObligation).toBe(10_000_000);
    expect(result.runwayBulan).toBe(7); // 70jt / 10jt = 7.0
    expect(result.weeklyProjections.length).toBeGreaterThan(0);
  });

  it("runwayBulan is null when no payroll batches", () => {
    const result = computeForekast({
      arusKas: [ak("kredit", 100_000_000)],
      fakturs: [], kewajiban: [], batches: [], today: TODAY,
    });
    expect(result.runwayBulan).toBeNull();
    expect(result.monthlyObligation).toBe(0);
  });
});
