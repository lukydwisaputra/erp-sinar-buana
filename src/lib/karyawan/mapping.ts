/**
 * Pure DB-row <-> app-shape mapping for Karyawan, kept free of any DB
 * connection import so these functions stay unit-testable without a live
 * Postgres — see `src/lib/karyawan/service.ts` for the actual queries.
 */
import type {
  employees,
  positions,
  employmentStatuses,
  employeeSalaryComponents,
  salaryComponents,
} from "@/lib/db/schema";
import type { Karyawan } from "@/lib/schemas/karyawan";

export type EmployeeRow = typeof employees.$inferSelect;
export type PositionRow = typeof positions.$inferSelect;
export type EmploymentStatusRow = typeof employmentStatuses.$inferSelect;
export type EmployeeSalaryComponentRow = typeof employeeSalaryComponents.$inferSelect;
export type SalaryComponentRow = typeof salaryComponents.$inferSelect;

export function toKaryawan(
  employee: EmployeeRow,
  position: PositionRow | undefined,
  employmentStatus: EmploymentStatusRow | undefined,
  tunjangan: number,
): Karyawan {
  return {
    id: employee.id,
    nama: employee.name,
    positionId: employee.positionId,
    jabatan: position?.label ?? "—",
    employmentStatusId: employee.employmentStatusId,
    statusKepegawaian: employmentStatus?.label ?? "—",
    pengali: employmentStatus ? Number(employmentStatus.multiplier) : 1,
    gajiPokok: Number(employee.baseSalary),
    tunjangan,
    bank: {
      nama: employee.bankName,
      nomor: employee.bankAccountNumber,
      atasNama: employee.bankAccountHolder,
    },
    npwp: employee.npwp,
    ptkpStatus: employee.ptkpStatus,
    email: employee.email,
    telepon: employee.phone,
    tanggalMasuk: employee.joinDate,
    status: employee.isActive ? "aktif" : "terarsip",
  };
}

/** Sums `tunjangan`-kind components only — `potongan` (deductions) belong to
 * Penggajian's slip calculation, not the Karyawan detail view. */
export function computeTunjangan(
  rows: { overrideValue: string | null; kind: string; defaultValue: string }[],
): number {
  return rows.reduce((sum, r) => {
    if (r.kind !== "tunjangan") return sum;
    const value = r.overrideValue !== null ? Number(r.overrideValue) : Number(r.defaultValue);
    return sum + value;
  }, 0);
}
