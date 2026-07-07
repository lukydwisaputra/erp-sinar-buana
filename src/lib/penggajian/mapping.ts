/**
 * Pure DB-row <-> app-shape mapping for Penggajian (payroll), kept free of
 * any DB connection import so these functions stay unit-testable without a
 * live Postgres — see `src/lib/penggajian/service.ts` for the actual
 * queries.
 *
 * "Batch" has no DB table of its own — payslips sharing (period_start,
 * period_end) are grouped at read time, with a synthetic `id` derived from
 * that pair so it's stable across reads and safe as a query key/URL segment.
 */
import type { payslips, payslipComponents, employees } from "@/lib/db/schema";
import type { SlipGaji, PenggajianBatch, PayslipComponent } from "@/lib/schemas/penggajian";

export type PayslipRow = typeof payslips.$inferSelect;
export type PayslipComponentRow = typeof payslipComponents.$inferSelect;
export type EmployeeRow = typeof employees.$inferSelect;

function sortByOrder<T extends { sortOrder: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function batchIdFor(periodStart: string, periodEnd: string): string {
  return `GAJ-${periodStart}_${periodEnd}`;
}

const BATCH_ID_RE = /^GAJ-(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})$/;

export function parseBatchId(batchId: string): { periodStart: string; periodEnd: string } | null {
  const m = BATCH_ID_RE.exec(batchId);
  if (!m) return null;
  return { periodStart: m[1], periodEnd: m[2] };
}

/** Groups any period-bearing rows (raw payslip rows) by (periodStart, periodEnd). */
export function groupPayslipsByPeriod<T extends { periodStart: string; periodEnd: string }>(
  rows: T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = batchIdFor(row.periodStart, row.periodEnd);
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }
  return map;
}

export function toPayslipComponent(row: PayslipComponentRow): PayslipComponent {
  return {
    id: row.id,
    salaryComponentId: row.salaryComponentId,
    name: row.name,
    kind: row.kind,
    amount: Number(row.amount),
    isEmployerPortion: row.isEmployerPortion,
    sortOrder: row.sortOrder,
  };
}

export type ToSlipGajiInput = {
  payslip: PayslipRow;
  components: PayslipComponentRow[];
  employee: EmployeeRow | undefined;
  statusLabel: string | null;
  statusSystemRole: string | null;
};

/** `jabatan`/`statusKepegawaian`/`pengali` come from the payslip's own
 * snapshot columns (accurate to what applied at issue time, even if the
 * employee's master data changes later) — `bank*`/`telepon`/`email` are
 * resolved live from the employee row instead, since a payslip going stale
 * on contact-info changes isn't a real concern the way pay math is. */
export function toSlipGaji(input: ToSlipGajiInput): SlipGaji {
  const p = input.payslip;
  const e = input.employee;
  return {
    id: p.id,
    batchId: batchIdFor(p.periodStart, p.periodEnd),
    number: p.number,
    karyawanId: p.employeeId,
    karyawanNama: e?.name ?? "",
    jabatan: p.positionSnapshot ?? "—",
    statusKepegawaian: p.employmentStatusSnapshot ?? "—",
    pengali: Number(p.multiplierSnapshot),
    gajiPokok: Number(p.baseSalary),
    components: sortByOrder(input.components).map(toPayslipComponent),
    lembur: Number(p.overtimeAmount),
    bonus: Number(p.bonusAmount),
    pph21: Number(p.pph21Amount),
    bankNama: e?.bankName ?? "",
    bankNomor: e?.bankAccountNumber ?? "",
    bankAtasNama: e?.bankAccountHolder ?? "",
    telepon: e?.phone ?? "",
    email: e?.email ?? "",
    statusId: p.statusId,
    status: (input.statusSystemRole === "DIBAYAR" && "sudah_dibayar")
      || (input.statusSystemRole === "BATAL" && "batal")
      || "menunggu_pembayaran",
    statusSystemRole: input.statusSystemRole,
    paidAt: p.paidDate,
  };
}

export function toPenggajianBatch(batchId: string, rows: PayslipRow[], slips: SlipGaji[]): PenggajianBatch {
  const earliest = rows.reduce((min, r) => (r.createdAt < min.createdAt ? r : min), rows[0]);
  const plannedPayDate = rows.find((r) => r.plannedPayDate)?.plannedPayDate
    ?? rows.find((r) => r.paidDate)?.paidDate
    ?? "";
  return {
    id: batchId,
    periode: { mulai: rows[0].periodStart, selesai: rows[0].periodEnd },
    tanggalBayar: plannedPayDate,
    slips,
    createdAt: earliest.createdAt.toISOString(),
  };
}
