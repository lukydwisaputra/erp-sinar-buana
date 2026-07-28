import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { withUserTransaction, withServiceRole, type Tx } from "@/lib/db/tx";
import { schema } from "@/lib/db/client";
import { NotFoundError, ConflictError } from "@/lib/api-error";
import { getDefaultStatusId, loadStatus, loadStatusLabelsByIds } from "@/lib/workflow-status";
import {
  toSlipGaji,
  toPenggajianBatch,
  batchIdFor,
  parseBatchId,
  groupPayslipsByPeriod,
  type PayslipRow,
  type PayslipComponentRow,
  type EmployeeRow,
} from "@/lib/penggajian/mapping";
import { calcSlip } from "@/lib/schemas/penggajian";
import type {
  PenggajianBatch,
  SlipGaji,
  CreateBatchInput,
  CreateComponentInput,
  UpdateSlipInput,
} from "@/lib/schemas/penggajian";

export { toSlipGaji, toPenggajianBatch, batchIdFor } from "@/lib/penggajian/mapping";

async function loadEmployeesById(tx: Tx, ids: string[]): Promise<Map<string, EmployeeRow>> {
  if (!ids.length) return new Map();
  const rows = await tx.select().from(schema.employees).where(inArray(schema.employees.id, ids));
  return new Map(rows.map((r) => [r.id, r]));
}

async function loadComponentsByPayslip(tx: Tx, payslipIds: string[]): Promise<Map<string, PayslipComponentRow[]>> {
  if (!payslipIds.length) return new Map();
  const rows = await tx.select().from(schema.payslipComponents).where(inArray(schema.payslipComponents.payslipId, payslipIds));
  const map = new Map<string, PayslipComponentRow[]>();
  for (const r of rows) {
    const list = map.get(r.payslipId) ?? [];
    list.push(r);
    map.set(r.payslipId, list);
  }
  return map;
}

async function assembleSlips(tx: Tx, rows: PayslipRow[]): Promise<SlipGaji[]> {
  const employeeIds = [...new Set(rows.map((r) => r.employeeId))];
  const statusIds = rows.map((r) => r.statusId).filter((x): x is string => !!x);
  const [employeesById, componentsByPayslip, statusLabelsById] = await Promise.all([
    loadEmployeesById(tx, employeeIds),
    loadComponentsByPayslip(tx, rows.map((r) => r.id)),
    loadStatusLabelsByIds(tx, statusIds),
  ]);
  const statusRoleById = new Map<string, string | null>();
  await Promise.all(
    [...new Set(statusIds)].map(async (id) => {
      const status = await loadStatus(tx, id);
      statusRoleById.set(id, status?.systemRole ?? null);
    }),
  );

  return rows.map((row) => toSlipGaji({
    payslip: row,
    components: componentsByPayslip.get(row.id) ?? [],
    employee: employeesById.get(row.employeeId),
    statusLabel: (row.statusId && statusLabelsById.get(row.statusId)) ?? null,
    statusSystemRole: row.statusId ? statusRoleById.get(row.statusId) ?? null : null,
  }));
}

export async function listBatches(userId: string): Promise<PenggajianBatch[]> {
  return withUserTransaction(userId, async (tx) => {
    const rows = await tx
      .select()
      .from(schema.payslips)
      .where(isNull(schema.payslips.deletedAt))
      .orderBy(asc(schema.payslips.periodStart));
    const slips = await assembleSlips(tx, rows);
    const slipsByBatch = new Map<string, SlipGaji[]>();
    for (const s of slips) {
      const list = slipsByBatch.get(s.batchId) ?? [];
      list.push(s);
      slipsByBatch.set(s.batchId, list);
    }
    const rowsByBatch = groupPayslipsByPeriod(rows);
    return [...rowsByBatch.entries()].map(([batchId, batchRows]) => toPenggajianBatch(batchId, batchRows, slipsByBatch.get(batchId) ?? []));
  });
}

export async function getBatch(userId: string, batchId: string): Promise<PenggajianBatch> {
  return withUserTransaction(userId, async (tx) => {
    const parsed = parseBatchId(batchId);
    if (!parsed) throw new NotFoundError("Batch tidak ditemukan.");
    const rows = await tx
      .select()
      .from(schema.payslips)
      .where(and(
        eq(schema.payslips.periodStart, parsed.periodStart),
        eq(schema.payslips.periodEnd, parsed.periodEnd),
        isNull(schema.payslips.deletedAt),
      ));
    if (!rows.length) throw new NotFoundError("Batch tidak ditemukan.");
    const slips = await assembleSlips(tx, rows);
    return toPenggajianBatch(batchId, rows, slips);
  });
}

async function getSlipWithinTx(tx: Tx, batchId: string, slipId: string): Promise<SlipGaji> {
  const [row] = await tx
    .select()
    .from(schema.payslips)
    .where(and(eq(schema.payslips.id, slipId), isNull(schema.payslips.deletedAt)))
    .limit(1);
  if (!row) throw new NotFoundError("Slip tidak ditemukan.");
  if (batchIdFor(row.periodStart, row.periodEnd) !== batchId) throw new NotFoundError("Slip tidak ditemukan pada batch ini.");
  const [slip] = await assembleSlips(tx, [row]);
  return slip;
}

export async function getSlip(userId: string, batchId: string, slipId: string): Promise<SlipGaji> {
  return withUserTransaction(userId, (tx) => getSlipWithinTx(tx, batchId, slipId));
}

/** Used only by the internal PDF-render pipeline (`src/app/print/**`, called
 * by the worker via headless browser, not a real user session) — elevated
 * since there's no logged-in user to scope RLS to. Skips the batch-id match
 * `getSlipWithinTx` does (that's a URL-consistency check for the app's own
 * nested route, irrelevant here — the worker already knows the exact payslip). */
export async function getSlipForPrint(payslipId: string): Promise<{ slip: SlipGaji; periode: { mulai: string; selesai: string } } | null> {
  return withServiceRole(async (tx) => {
    const [row] = await tx
      .select()
      .from(schema.payslips)
      .where(and(eq(schema.payslips.id, payslipId), isNull(schema.payslips.deletedAt)))
      .limit(1);
    if (!row) return null;
    const [slip] = await assembleSlips(tx, [row]);
    return { slip, periode: { mulai: row.periodStart, selesai: row.periodEnd } };
  });
}

/** Resolves an employee's configured salary components (both tunjangan and
 * potongan kinds) into prefillable line-item defaults — `persentase`
 * components are computed against `baseEffective` (base × multiplier),
 * `nominal`/`per_hari` use the configured value as-is (per_hari has no
 * day-count data anywhere in this codebase, so it's just a starting
 * amount — always editable in the wizard). */
export async function getEmployeeDefaults(userId: string, employeeId: string): Promise<CreateComponentInput[]> {
  return withUserTransaction(userId, async (tx) => {
    const [employee] = await tx
      .select({ baseSalary: schema.employees.baseSalary, employmentStatusId: schema.employees.employmentStatusId })
      .from(schema.employees)
      .where(eq(schema.employees.id, employeeId))
      .limit(1);
    if (!employee) throw new NotFoundError("Karyawan tidak ditemukan.");

    let multiplier = 1;
    if (employee.employmentStatusId) {
      const [status] = await tx
        .select({ multiplier: schema.employmentStatuses.multiplier })
        .from(schema.employmentStatuses)
        .where(eq(schema.employmentStatuses.id, employee.employmentStatusId))
        .limit(1);
      if (status) multiplier = Number(status.multiplier);
    }
    const baseEffective = Number(employee.baseSalary) * multiplier;

    const rows = await tx
      .select({
        salaryComponentId: schema.salaryComponents.id,
        label: schema.salaryComponents.label,
        kind: schema.salaryComponents.kind,
        calcType: schema.salaryComponents.calcType,
        defaultValue: schema.salaryComponents.defaultValue,
        isEmployerPortion: schema.salaryComponents.isEmployerPortion,
        overrideValue: schema.employeeSalaryComponents.overrideValue,
      })
      .from(schema.employeeSalaryComponents)
      .innerJoin(schema.salaryComponents, eq(schema.employeeSalaryComponents.salaryComponentId, schema.salaryComponents.id))
      .where(eq(schema.employeeSalaryComponents.employeeId, employeeId));

    return rows.map((r) => {
      const raw = r.overrideValue !== null ? Number(r.overrideValue) : Number(r.defaultValue);
      const amount = r.calcType === "persentase" ? Math.round((raw / 100) * baseEffective) : raw;
      return {
        salaryComponentId: r.salaryComponentId,
        name: r.label,
        kind: r.kind,
        amount,
        isEmployerPortion: r.isEmployerPortion,
      };
    });
  });
}

export async function createBatch(userId: string, input: CreateBatchInput): Promise<PenggajianBatch> {
  return withUserTransaction(userId, async (tx) => {
    const employeeIds = input.slips.map((s) => s.karyawanId);
    const employees = await tx.select().from(schema.employees).where(inArray(schema.employees.id, employeeIds));
    const employeesById = new Map(employees.map((e) => [e.id, e]));

    const statusIds = [...new Set(employees.map((e) => e.employmentStatusId).filter((x): x is string => !!x))];
    const positionIds = [...new Set(employees.map((e) => e.positionId).filter((x): x is string => !!x))];
    const [statusRows, positionRows] = await Promise.all([
      statusIds.length ? tx.select().from(schema.employmentStatuses).where(inArray(schema.employmentStatuses.id, statusIds)) : Promise.resolve([]),
      positionIds.length ? tx.select().from(schema.positions).where(inArray(schema.positions.id, positionIds)) : Promise.resolve([]),
    ]);
    const statusById = new Map(statusRows.map((s) => [s.id, s]));
    const positionById = new Map(positionRows.map((p) => [p.id, p]));

    const statusId = await getDefaultStatusId(tx, "penggajian");
    const insertedIds: string[] = [];

    for (const slipInput of input.slips) {
      const employee = employeesById.get(slipInput.karyawanId);
      if (!employee) throw new NotFoundError(`Karyawan ${slipInput.karyawanId} tidak ditemukan.`);
      const status = employee.employmentStatusId ? statusById.get(employee.employmentStatusId) : undefined;
      const position = employee.positionId ? positionById.get(employee.positionId) : undefined;
      const pengali = status ? Number(status.multiplier) : 1;
      const gajiPokok = Number(employee.baseSalary);
      const baseEffective = gajiPokok * pengali;

      const { penggajianKotor, penggajianBersih } = calcSlip({
        gajiPokok, pengali,
        lembur: slipInput.lembur, bonus: slipInput.bonus, pph21: slipInput.pph21,
        components: slipInput.components,
      });

      const [payslip] = await tx
        .insert(schema.payslips)
        .values({
          employeeId: employee.id,
          positionSnapshot: position?.label ?? null,
          employmentStatusSnapshot: status?.label ?? null,
          multiplierSnapshot: String(pengali),
          periodStart: input.periode.mulai,
          periodEnd: input.periode.selesai,
          plannedPayDate: input.tanggalBayar,
          statusId,
          baseSalary: String(gajiPokok),
          baseEffective: String(baseEffective),
          overtimeAmount: String(slipInput.lembur),
          bonusAmount: String(slipInput.bonus),
          pph21Amount: String(slipInput.pph21),
          grossPay: String(penggajianKotor),
          netPay: String(penggajianBersih),
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();

      if (slipInput.components.length) {
        await tx.insert(schema.payslipComponents).values(
          slipInput.components.map((c, i) => ({
            payslipId: payslip.id,
            salaryComponentId: c.salaryComponentId ?? null,
            name: c.name,
            kind: c.kind,
            amount: String(c.amount),
            isEmployerPortion: c.isEmployerPortion,
            sortOrder: i,
          })),
        );
      }
      insertedIds.push(payslip.id);
    }

    const batchId = batchIdFor(input.periode.mulai, input.periode.selesai);
    return getBatchWithinTx(tx, batchId, insertedIds);
  });
}

async function getBatchWithinTx(tx: Tx, batchId: string, includeIds?: string[]): Promise<PenggajianBatch> {
  const parsed = parseBatchId(batchId);
  if (!parsed) throw new NotFoundError("Batch tidak ditemukan.");
  const rows = await tx
    .select()
    .from(schema.payslips)
    .where(and(
      eq(schema.payslips.periodStart, parsed.periodStart),
      eq(schema.payslips.periodEnd, parsed.periodEnd),
      isNull(schema.payslips.deletedAt),
    ));
  const relevant = includeIds ? rows.filter((r) => includeIds.includes(r.id)) : rows;
  const slips = await assembleSlips(tx, rows);
  const slipsById = new Map(slips.map((s) => [s.id, s]));
  return toPenggajianBatch(batchId, rows, relevant.map((r) => slipsById.get(r.id)!));
}

async function requireEditableSlip(tx: Tx, slipId: string): Promise<PayslipRow> {
  const [row] = await tx.select().from(schema.payslips).where(eq(schema.payslips.id, slipId)).limit(1);
  if (!row) throw new NotFoundError("Slip tidak ditemukan.");
  const status = await loadStatus(tx, row.statusId);
  if (status?.systemRole === "DIBAYAR" || status?.systemRole === "BATAL") {
    throw new ConflictError("Slip yang sudah dibayar atau dibatalkan tidak dapat diubah.");
  }
  return row;
}

export async function updateSlip(userId: string, batchId: string, slipId: string, input: UpdateSlipInput): Promise<SlipGaji> {
  return withUserTransaction(userId, async (tx) => {
    const existing = await requireEditableSlip(tx, slipId);

    const lembur = input.lembur ?? Number(existing.overtimeAmount);
    const bonus = input.bonus ?? Number(existing.bonusAmount);
    const pph21 = input.pph21 ?? Number(existing.pph21Amount);
    let components = input.components;
    if (components === undefined) {
      const existingComponents = await tx.select().from(schema.payslipComponents).where(eq(schema.payslipComponents.payslipId, slipId));
      components = existingComponents.map((c) => ({
        salaryComponentId: c.salaryComponentId, name: c.name, kind: c.kind,
        amount: Number(c.amount), isEmployerPortion: c.isEmployerPortion,
      }));
    }

    const { penggajianKotor, penggajianBersih } = calcSlip({
      gajiPokok: Number(existing.baseSalary), pengali: Number(existing.multiplierSnapshot),
      lembur, bonus, pph21, components,
    });

    await tx
      .update(schema.payslips)
      .set({
        overtimeAmount: String(lembur),
        bonusAmount: String(bonus),
        pph21Amount: String(pph21),
        grossPay: String(penggajianKotor),
        netPay: String(penggajianBersih),
        updatedBy: userId,
      })
      .where(eq(schema.payslips.id, slipId));

    if (input.components !== undefined) {
      await tx.delete(schema.payslipComponents).where(eq(schema.payslipComponents.payslipId, slipId));
      if (input.components.length) {
        await tx.insert(schema.payslipComponents).values(
          input.components.map((c, i) => ({
            payslipId: slipId,
            salaryComponentId: c.salaryComponentId ?? null,
            name: c.name,
            kind: c.kind,
            amount: String(c.amount),
            isEmployerPortion: c.isEmployerPortion,
            sortOrder: i,
          })),
        );
      }
    }

    return getSlipWithinTx(tx, batchId, slipId);
  });
}

/** Pure status/field update — `fn_payslip_after_change` handles all
 * DIBAYAR/BATAL automation (cashflow + tax entries) when statusId changes;
 * the app never duplicates that logic. */
export async function markSlipDibayar(userId: string, batchId: string, slipId: string): Promise<SlipGaji> {
  return withUserTransaction(userId, async (tx) => {
    await requireEditableSlip(tx, slipId);
    const statusId = await getPenggajianStatusId(tx, "DIBAYAR");
    await tx
      .update(schema.payslips)
      .set({ statusId, paidDate: new Date().toISOString().slice(0, 10), updatedBy: userId })
      .where(eq(schema.payslips.id, slipId));
    return getSlipWithinTx(tx, batchId, slipId);
  });
}

export async function cancelSlip(userId: string, batchId: string, slipId: string): Promise<SlipGaji> {
  return withUserTransaction(userId, async (tx) => {
    await requireEditableSlip(tx, slipId);
    const statusId = await getPenggajianStatusId(tx, "BATAL");
    await tx
      .update(schema.payslips)
      .set({ statusId, updatedBy: userId })
      .where(eq(schema.payslips.id, slipId));
    return getSlipWithinTx(tx, batchId, slipId);
  });
}

/** Bulk convenience over cancelSlip — skips slips already DIBAYAR/BATAL
 * instead of failing the whole batch, since a partially-final batch should
 * still cancel what it still can. */
export async function cancelBatch(userId: string, batchId: string): Promise<PenggajianBatch> {
  return withUserTransaction(userId, async (tx) => {
    const parsed = parseBatchId(batchId);
    if (!parsed) throw new NotFoundError("Batch tidak ditemukan.");
    const rows = await tx
      .select()
      .from(schema.payslips)
      .where(and(
        eq(schema.payslips.periodStart, parsed.periodStart),
        eq(schema.payslips.periodEnd, parsed.periodEnd),
        isNull(schema.payslips.deletedAt),
      ));
    if (!rows.length) throw new NotFoundError("Batch tidak ditemukan.");

    const batalStatusId = await getPenggajianStatusId(tx, "BATAL");
    for (const row of rows) {
      const status = await loadStatus(tx, row.statusId);
      if (status?.systemRole === "DIBAYAR" || status?.systemRole === "BATAL") continue;
      await tx.update(schema.payslips).set({ statusId: batalStatusId, updatedBy: userId }).where(eq(schema.payslips.id, row.id));
    }

    const refreshedRows = await tx
      .select()
      .from(schema.payslips)
      .where(and(
        eq(schema.payslips.periodStart, parsed.periodStart),
        eq(schema.payslips.periodEnd, parsed.periodEnd),
        isNull(schema.payslips.deletedAt),
      ));
    const slips = await assembleSlips(tx, refreshedRows);
    return toPenggajianBatch(batchId, refreshedRows, slips);
  });
}

async function getPenggajianStatusId(tx: Tx, systemRole: "DIBAYAR" | "BATAL"): Promise<string> {
  const [row] = await tx
    .select({ id: schema.workflowStatuses.id })
    .from(schema.workflowStatuses)
    .where(and(eq(schema.workflowStatuses.entity, "penggajian"), eq(schema.workflowStatuses.systemRole, systemRole)))
    .limit(1);
  if (!row) throw new NotFoundError(`Status "${systemRole}" untuk penggajian tidak ditemukan — jalankan seed data.`);
  return row.id;
}
