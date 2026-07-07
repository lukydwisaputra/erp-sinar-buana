import { describe, it, expect } from "vitest";
import {
  batchIdFor,
  parseBatchId,
  groupPayslipsByPeriod,
  toPayslipComponent,
  toSlipGaji,
  toPenggajianBatch,
  type PayslipRow,
  type PayslipComponentRow,
  type EmployeeRow,
} from "@/lib/penggajian/mapping";
import { calcSlip } from "@/lib/schemas/penggajian";

function payslip(overrides: Partial<PayslipRow> = {}): PayslipRow {
  return {
    id: "ps-1", number: "GAJ/001/6.2026", numberYear: 2026, numberMonth: 6,
    employeeId: "emp-1",
    positionSnapshot: "Staff Teknik", employmentStatusSnapshot: "Tetap", multiplierSnapshot: "1",
    periodStart: "2026-06-01", periodEnd: "2026-06-30", plannedPayDate: "2026-07-05",
    statusId: "status-1", paidDate: null,
    baseSalary: "8000000", baseEffective: "8000000",
    overtimeAmount: "0", bonusAmount: "0", pph21Amount: "0",
    grossPay: "8000000", netPay: "8000000",
    notes: null,
    createdAt: new Date("2026-06-01T00:00:00.000Z"), updatedAt: new Date(),
    createdBy: null, updatedBy: null, deletedAt: null, deletedBy: null,
    ...overrides,
  } as PayslipRow;
}

function component(overrides: Partial<PayslipComponentRow> = {}): PayslipComponentRow {
  return {
    id: "pc-1", payslipId: "ps-1", salaryComponentId: "sc-1",
    name: "Tunjangan Transport", kind: "tunjangan", amount: "1000000",
    isEmployerPortion: false, sortOrder: 0,
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  } as PayslipComponentRow;
}

function employee(overrides: Partial<EmployeeRow> = {}): EmployeeRow {
  return {
    id: "emp-1", name: "Budi Santoso", positionId: null, employmentStatusId: null,
    baseSalary: "8000000", bankName: "BCA", bankAccountNumber: "123456", bankAccountHolder: "Budi Santoso",
    npwp: null, ptkpStatus: null, email: "budi@example.com", phone: "0812-0000-0001",
    joinDate: "2020-01-01", isActive: true,
    createdAt: new Date(), updatedAt: new Date(), createdBy: null, updatedBy: null, deletedAt: null, deletedBy: null,
    ...overrides,
  } as EmployeeRow;
}

describe("batchIdFor / parseBatchId", () => {
  it("round-trips a period pair through the synthetic batch id", () => {
    const id = batchIdFor("2026-06-01", "2026-06-30");
    expect(id).toBe("GAJ-2026-06-01_2026-06-30");
    expect(parseBatchId(id)).toEqual({ periodStart: "2026-06-01", periodEnd: "2026-06-30" });
  });

  it("returns null for a malformed batch id", () => {
    expect(parseBatchId("not-a-batch-id")).toBeNull();
  });
});

describe("groupPayslipsByPeriod", () => {
  it("groups rows sharing the same period into one batch key", () => {
    const rows = [
      payslip({ id: "a", periodStart: "2026-06-01", periodEnd: "2026-06-30" }),
      payslip({ id: "b", periodStart: "2026-06-01", periodEnd: "2026-06-30" }),
      payslip({ id: "c", periodStart: "2026-07-01", periodEnd: "2026-07-31" }),
    ];
    const grouped = groupPayslipsByPeriod(rows);
    expect(grouped.size).toBe(2);
    expect(grouped.get("GAJ-2026-06-01_2026-06-30")?.map((r) => r.id)).toEqual(["a", "b"]);
    expect(grouped.get("GAJ-2026-07-01_2026-07-31")?.map((r) => r.id)).toEqual(["c"]);
  });
});

describe("toPayslipComponent", () => {
  it("coerces the numeric amount column", () => {
    const c = toPayslipComponent(component({ amount: "1500000.50" }));
    expect(c.amount).toBe(1500000.5);
    expect(c.kind).toBe("tunjangan");
  });
});

describe("toSlipGaji", () => {
  it("resolves status from systemRole, not the label", () => {
    const dibayar = toSlipGaji({
      payslip: payslip(), components: [], employee: employee(),
      statusLabel: "Sudah Dibayar", statusSystemRole: "DIBAYAR",
    });
    expect(dibayar.status).toBe("sudah_dibayar");

    const batal = toSlipGaji({
      payslip: payslip(), components: [], employee: employee(),
      statusLabel: "Batal", statusSystemRole: "BATAL",
    });
    expect(batal.status).toBe("batal");

    const menunggu = toSlipGaji({
      payslip: payslip(), components: [], employee: employee(),
      statusLabel: "Menunggu Pembayaran", statusSystemRole: null,
    });
    expect(menunggu.status).toBe("menunggu_pembayaran");
  });

  it("uses payslip snapshot fields for jabatan/statusKepegawaian/pengali, not live employee data", () => {
    const slip = toSlipGaji({
      payslip: payslip({ positionSnapshot: "Ketua Tim", employmentStatusSnapshot: "Kontrak", multiplierSnapshot: "0.8" }),
      components: [], employee: employee(),
      statusLabel: null, statusSystemRole: null,
    });
    expect(slip.jabatan).toBe("Ketua Tim");
    expect(slip.statusKepegawaian).toBe("Kontrak");
    expect(slip.pengali).toBe(0.8);
  });

  it("resolves bank/contact fields live from the employee row", () => {
    const slip = toSlipGaji({
      payslip: payslip(), components: [], employee: employee({ phone: "0899-9999", email: "new@example.com" }),
      statusLabel: null, statusSystemRole: null,
    });
    expect(slip.telepon).toBe("0899-9999");
    expect(slip.email).toBe("new@example.com");
  });

  it("falls back to empty strings when the employee row is missing", () => {
    const slip = toSlipGaji({
      payslip: payslip(), components: [], employee: undefined,
      statusLabel: null, statusSystemRole: null,
    });
    expect(slip.karyawanNama).toBe("");
    expect(slip.telepon).toBe("");
    expect(slip.bankNama).toBe("");
  });

  it("sorts components by sortOrder", () => {
    const slip = toSlipGaji({
      payslip: payslip(),
      components: [
        component({ id: "c2", name: "B", sortOrder: 1 }),
        component({ id: "c1", name: "A", sortOrder: 0 }),
      ],
      employee: employee(),
      statusLabel: null, statusSystemRole: null,
    });
    expect(slip.components.map((c) => c.name)).toEqual(["A", "B"]);
  });
});

describe("toPenggajianBatch", () => {
  it("uses the earliest createdAt and the group's planned pay date", () => {
    const rows = [
      payslip({ id: "a", createdAt: new Date("2026-06-02T00:00:00.000Z"), plannedPayDate: "2026-07-05" }),
      payslip({ id: "b", createdAt: new Date("2026-06-01T00:00:00.000Z"), plannedPayDate: "2026-07-05" }),
    ];
    const batch = toPenggajianBatch("GAJ-2026-06-01_2026-06-30", rows, []);
    expect(batch.createdAt).toBe("2026-06-01T00:00:00.000Z");
    expect(batch.tanggalBayar).toBe("2026-07-05");
    expect(batch.periode).toEqual({ mulai: "2026-06-01", selesai: "2026-06-30" });
  });

  it("falls back to a paid slip's paidDate when no plannedPayDate is set", () => {
    const rows = [payslip({ plannedPayDate: null, paidDate: "2026-07-06" })];
    const batch = toPenggajianBatch("GAJ-2026-06-01_2026-06-30", rows, []);
    expect(batch.tanggalBayar).toBe("2026-07-06");
  });
});

describe("calcSlip", () => {
  const base = { gajiPokok: 8_000_000, pengali: 1, lembur: 500_000, bonus: 0, pph21: 150_000 };

  it("sums tunjangan-kind components into gross, potongan-kind (non-employer) into deductions", () => {
    const result = calcSlip({
      ...base,
      components: [
        { kind: "tunjangan", amount: 1_000_000, isEmployerPortion: false },
        { kind: "potongan", amount: 80_000, isEmployerPortion: false },
      ],
    });
    expect(result.gajiPokokEfektif).toBe(8_000_000);
    expect(result.tunjanganTotal).toBe(1_000_000);
    expect(result.potonganTotal).toBe(80_000);
    expect(result.penggajianKotor).toBe(8_000_000 + 1_000_000 + 500_000); // + lembur
    expect(result.penggajianBersih).toBe(result.penggajianKotor - 150_000 - 80_000);
  });

  it("excludes employer-portion potongan lines from take-home deductions", () => {
    const withEmployer = calcSlip({
      ...base,
      components: [{ kind: "potongan", amount: 320_000, isEmployerPortion: true }],
    });
    const withoutAny = calcSlip({ ...base, components: [] });
    expect(withEmployer.penggajianBersih).toBe(withoutAny.penggajianBersih);
    expect(withEmployer.potonganTotal).toBe(0);
  });

  it("applies the employment multiplier to base salary", () => {
    const result = calcSlip({ ...base, pengali: 0.8, components: [] });
    expect(result.gajiPokokEfektif).toBe(6_400_000);
  });
});
