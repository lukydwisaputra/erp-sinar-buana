import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { withUserTransaction, type Tx } from "@/lib/db/tx";
import { schema } from "@/lib/db/client";
import { NotFoundError } from "@/lib/api-error";
import { toKaryawan, computeTunjangan, type EmployeeRow, type PositionRow, type EmploymentStatusRow } from "@/lib/karyawan/mapping";
import type { Karyawan, CreateKaryawanInput, UpdateKaryawanInput } from "@/lib/schemas/karyawan";

export { toKaryawan, computeTunjangan } from "@/lib/karyawan/mapping";

async function loadTunjanganMap(tx: Tx, employeeIds: string[]): Promise<Map<string, number>> {
  if (!employeeIds.length) return new Map();
  const rows = await tx
    .select({
      employeeId: schema.employeeSalaryComponents.employeeId,
      overrideValue: schema.employeeSalaryComponents.overrideValue,
      kind: schema.salaryComponents.kind,
      defaultValue: schema.salaryComponents.defaultValue,
    })
    .from(schema.employeeSalaryComponents)
    .innerJoin(
      schema.salaryComponents,
      eq(schema.employeeSalaryComponents.salaryComponentId, schema.salaryComponents.id),
    )
    .where(inArray(schema.employeeSalaryComponents.employeeId, employeeIds));

  const byEmployee = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = byEmployee.get(row.employeeId) ?? [];
    list.push(row);
    byEmployee.set(row.employeeId, list);
  }
  const totals = new Map<string, number>();
  for (const [employeeId, list] of byEmployee) {
    totals.set(employeeId, computeTunjangan(list));
  }
  return totals;
}

async function loadRefs(tx: Tx, rows: EmployeeRow[]) {
  const positionIds = [...new Set(rows.map((r) => r.positionId).filter((x): x is string => !!x))];
  const statusIds = [...new Set(rows.map((r) => r.employmentStatusId).filter((x): x is string => !!x))];
  const positionRows = positionIds.length
    ? await tx.select().from(schema.positions).where(inArray(schema.positions.id, positionIds))
    : [];
  const statusRows = statusIds.length
    ? await tx.select().from(schema.employmentStatuses).where(inArray(schema.employmentStatuses.id, statusIds))
    : [];
  return {
    positionsById: new Map(positionRows.map((p) => [p.id, p])),
    statusesById: new Map(statusRows.map((s) => [s.id, s])),
  };
}

function refFor(
  row: EmployeeRow,
  positionsById: Map<string, PositionRow>,
  statusesById: Map<string, EmploymentStatusRow>,
) {
  return {
    position: row.positionId ? positionsById.get(row.positionId) : undefined,
    status: row.employmentStatusId ? statusesById.get(row.employmentStatusId) : undefined,
  };
}

export async function listEmployees(userId: string): Promise<Karyawan[]> {
  return withUserTransaction(userId, async (tx) => {
    const rows = await tx
      .select()
      .from(schema.employees)
      .where(isNull(schema.employees.deletedAt))
      .orderBy(desc(schema.employees.createdAt));
    const { positionsById, statusesById } = await loadRefs(tx, rows);
    const tunjanganMap = await loadTunjanganMap(tx, rows.map((r) => r.id));
    return rows.map((row) => {
      const { position, status } = refFor(row, positionsById, statusesById);
      return toKaryawan(row, position, status, tunjanganMap.get(row.id) ?? 0);
    });
  });
}

export async function getEmployee(userId: string, id: string): Promise<Karyawan> {
  return withUserTransaction(userId, async (tx) => {
    const [row] = await tx
      .select()
      .from(schema.employees)
      .where(and(eq(schema.employees.id, id), isNull(schema.employees.deletedAt)))
      .limit(1);
    if (!row) throw new NotFoundError("Karyawan tidak ditemukan.");
    const { positionsById, statusesById } = await loadRefs(tx, [row]);
    const { position, status } = refFor(row, positionsById, statusesById);
    const tunjanganMap = await loadTunjanganMap(tx, [id]);
    return toKaryawan(row, position, status, tunjanganMap.get(id) ?? 0);
  });
}

export async function createEmployee(userId: string, input: CreateKaryawanInput): Promise<Karyawan> {
  return withUserTransaction(userId, async (tx) => {
    const [row] = await tx
      .insert(schema.employees)
      .values({
        name: input.nama,
        positionId: input.positionId,
        employmentStatusId: input.employmentStatusId,
        baseSalary: String(input.gajiPokok),
        bankName: input.bankNama || null,
        bankAccountNumber: input.bankNomor || null,
        bankAccountHolder: input.bankAtasNama || null,
        npwp: input.npwp || null,
        ptkpStatus: input.ptkpStatus || null,
        email: input.email || null,
        phone: input.telepon || null,
        joinDate: input.tanggalMasuk,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();
    const { positionsById, statusesById } = await loadRefs(tx, [row]);
    const { position, status } = refFor(row, positionsById, statusesById);
    return toKaryawan(row, position, status, 0);
  });
}

export async function updateEmployee(
  userId: string,
  id: string,
  input: UpdateKaryawanInput,
): Promise<Karyawan> {
  return withUserTransaction(userId, async (tx) => {
    const [existing] = await tx
      .select({ id: schema.employees.id })
      .from(schema.employees)
      .where(and(eq(schema.employees.id, id), isNull(schema.employees.deletedAt)))
      .limit(1);
    if (!existing) throw new NotFoundError("Karyawan tidak ditemukan.");

    const [row] = await tx
      .update(schema.employees)
      .set({
        ...(input.nama !== undefined && { name: input.nama }),
        ...(input.positionId !== undefined && { positionId: input.positionId }),
        ...(input.employmentStatusId !== undefined && { employmentStatusId: input.employmentStatusId }),
        ...(input.gajiPokok !== undefined && { baseSalary: String(input.gajiPokok) }),
        ...(input.bankNama !== undefined && { bankName: input.bankNama || null }),
        ...(input.bankNomor !== undefined && { bankAccountNumber: input.bankNomor || null }),
        ...(input.bankAtasNama !== undefined && { bankAccountHolder: input.bankAtasNama || null }),
        ...(input.npwp !== undefined && { npwp: input.npwp || null }),
        ...(input.ptkpStatus !== undefined && { ptkpStatus: input.ptkpStatus || null }),
        ...(input.email !== undefined && { email: input.email || null }),
        ...(input.telepon !== undefined && { phone: input.telepon || null }),
        ...(input.tanggalMasuk !== undefined && { joinDate: input.tanggalMasuk }),
        ...(input.status !== undefined && { isActive: input.status === "aktif" }),
        updatedBy: userId,
      })
      .where(eq(schema.employees.id, id))
      .returning();

    const { positionsById, statusesById } = await loadRefs(tx, [row]);
    const { position, status } = refFor(row, positionsById, statusesById);
    const tunjanganMap = await loadTunjanganMap(tx, [id]);
    return toKaryawan(row, position, status, tunjanganMap.get(id) ?? 0);
  });
}
