import { describe, it, expect } from "vitest";
import { toKaryawan, computeTunjangan } from "@/lib/karyawan/mapping";

function employee(overrides: Partial<Parameters<typeof toKaryawan>[0]> = {}) {
  return {
    id: "emp-1",
    number: null,
    numberYear: null,
    numberMonth: null,
    name: "Budi Santoso",
    positionId: "pos-1",
    employmentStatusId: "status-1",
    baseSalary: "12000000",
    bankName: "BCA",
    bankAccountNumber: "1234567890",
    bankAccountHolder: "Budi Santoso",
    npwp: "0911122234440001",
    ptkpStatus: "TK/0",
    joinDate: "2021-02-10",
    phone: "0812-1111-2201",
    email: "budi@sinarbuana.co.id",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: null,
    updatedBy: null,
    deletedAt: null,
    deletedBy: null,
    ...overrides,
  };
}

const position = { id: "pos-1", label: "Ketua Tim Teknis", isActive: true, sortOrder: 1, createdAt: new Date(), updatedAt: new Date() };
const status = { id: "status-1", label: "Tetap", multiplier: "1.0000", isActive: true, sortOrder: 1, createdAt: new Date(), updatedAt: new Date() };

describe("toKaryawan", () => {
  it("resolves position/employment-status labels and the multiplier", () => {
    const result = toKaryawan(employee(), position, status, 0);
    expect(result.jabatan).toBe("Ketua Tim Teknis");
    expect(result.statusKepegawaian).toBe("Tetap");
    expect(result.pengali).toBe(1);
  });

  it("falls back to '—' and pengali 1 when position/status are unresolved", () => {
    const result = toKaryawan(employee({ positionId: null, employmentStatusId: null }), undefined, undefined, 0);
    expect(result.jabatan).toBe("—");
    expect(result.statusKepegawaian).toBe("—");
    expect(result.pengali).toBe(1);
  });

  it("maps is_active true/false to status aktif/terarsip", () => {
    expect(toKaryawan(employee({ isActive: true }), position, status, 0).status).toBe("aktif");
    expect(toKaryawan(employee({ isActive: false }), position, status, 0).status).toBe("terarsip");
  });

  it("passes through the precomputed tunjangan figure", () => {
    expect(toKaryawan(employee(), position, status, 1_500_000).tunjangan).toBe(1_500_000);
  });

  it("nulls out bank fields when the employee has none on file", () => {
    const result = toKaryawan(
      employee({ bankName: null, bankAccountNumber: null, bankAccountHolder: null }),
      position, status, 0,
    );
    expect(result.bank).toEqual({ nama: null, nomor: null, atasNama: null });
  });
});

describe("computeTunjangan", () => {
  it("sums only tunjangan-kind components, ignoring potongan", () => {
    const total = computeTunjangan([
      { overrideValue: "500000", kind: "tunjangan", defaultValue: "0" },
      { overrideValue: null, kind: "potongan", defaultValue: "200000" },
    ]);
    expect(total).toBe(500_000);
  });

  it("falls back to the component's defaultValue when overrideValue is null", () => {
    const total = computeTunjangan([{ overrideValue: null, kind: "tunjangan", defaultValue: "300000" }]);
    expect(total).toBe(300_000);
  });

  it("returns 0 for an employee with no components", () => {
    expect(computeTunjangan([])).toBe(0);
  });
});
