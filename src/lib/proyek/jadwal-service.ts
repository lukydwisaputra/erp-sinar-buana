import { and, eq, gt, inArray } from "drizzle-orm";
import { withUserTransaction, type Tx } from "@/lib/db/tx";
import { schema } from "@/lib/db/client";
import { toProyekJadwal } from "@/lib/proyek/jadwal-mapping";
import type { ProyekJadwal } from "@/lib/schemas/proyek";

async function loadServiceNameForSchedule(tx: Tx, quotationItemId: string | null): Promise<string | null> {
  if (!quotationItemId) return null;
  const [item] = await tx.select({ serviceId: schema.quotationItems.serviceId }).from(schema.quotationItems).where(eq(schema.quotationItems.id, quotationItemId)).limit(1);
  if (!item?.serviceId) return null;
  const [svc] = await tx.select({ name: schema.serviceCatalog.name }).from(schema.serviceCatalog).where(eq(schema.serviceCatalog.id, item.serviceId)).limit(1);
  return svc?.name ?? null;
}

export async function getProjectSchedules(userId: string, projectId: string): Promise<ProyekJadwal[]> {
  return withUserTransaction(userId, async (tx) => {
    const schedules = await tx.select().from(schema.activitySchedules).where(eq(schema.activitySchedules.projectId, projectId));
    if (!schedules.length) return [];

    const scheduleIds = schedules.map((s) => s.id);
    const allRows = await tx.select().from(schema.activityScheduleRows).where(inArray(schema.activityScheduleRows.scheduleId, scheduleIds));
    const allRowIds = allRows.map((r) => r.id);
    const allMarkedWeeks = allRowIds.length
      ? await tx.select().from(schema.activityScheduleMarkedWeeks).where(inArray(schema.activityScheduleMarkedWeeks.rowId, allRowIds))
      : [];

    return Promise.all(
      schedules.map(async (schedule) => {
        const rows = allRows.filter((r) => r.scheduleId === schedule.id);
        const rowIdSet = new Set(rows.map((r) => r.id));
        const markedWeeks = allMarkedWeeks.filter((mw) => rowIdSet.has(mw.rowId));
        const layananNama = await loadServiceNameForSchedule(tx, schedule.quotationItemId);
        return toProyekJadwal({ schedule, layananNama, rows, markedWeeks });
      }),
    );
  });
}

/** The Deal-time hand-off — CLONES the activity_schedules/rows/marked_weeks
 * (rencana only, isActual=0) Penawaran wrote at SPH time into fresh
 * project-owned rows, rather than re-pointing the same ones. The SPH's own
 * Estimasi Jadwal stays exactly as authored (frozen "planning" record); the
 * project gets its own independent, editable copy (the "actual execution
 * plan") — two records, not one shared row, so editing either side never
 * touches the other. Runs inside the caller's transaction (createProyek),
 * not its own. */
export async function cloneQuotationSchedulesToProject(tx: Tx, quotationId: string, projectId: string): Promise<void> {
  const sourceSchedules = await tx.select().from(schema.activitySchedules).where(eq(schema.activitySchedules.quotationId, quotationId));
  if (!sourceSchedules.length) return;

  const sourceScheduleIds = sourceSchedules.map((s) => s.id);
  const sourceRows = await tx.select().from(schema.activityScheduleRows).where(inArray(schema.activityScheduleRows.scheduleId, sourceScheduleIds));
  const sourceRowIds = sourceRows.map((r) => r.id);
  const sourceMarkedWeeks = sourceRowIds.length
    ? await tx.select().from(schema.activityScheduleMarkedWeeks).where(
        and(inArray(schema.activityScheduleMarkedWeeks.rowId, sourceRowIds), eq(schema.activityScheduleMarkedWeeks.isActual, 0)),
      )
    : [];

  for (const source of sourceSchedules) {
    const [cloned] = await tx
      .insert(schema.activitySchedules)
      .values({
        projectId,
        quotationItemId: source.quotationItemId, // traceability only — which service this maps to
        numMonths: source.numMonths,
        weeksPerMonth: source.weeksPerMonth,
      })
      .returning();

    const rowsForSchedule = sourceRows.filter((r) => r.scheduleId === source.id);
    if (!rowsForSchedule.length) continue;

    const clonedRows = await tx
      .insert(schema.activityScheduleRows)
      .values(rowsForSchedule.map((r) => ({ scheduleId: cloned.id, activityName: r.activityName, sortOrder: r.sortOrder })))
      .returning();

    const weekValues = rowsForSchedule.flatMap((sourceRow, i) =>
      sourceMarkedWeeks
        .filter((mw) => mw.rowId === sourceRow.id)
        .map((mw) => ({ rowId: clonedRows[i].id, weekNumber: mw.weekNumber, isActual: 0 })),
    );
    if (weekValues.length) {
      await tx.insert(schema.activityScheduleMarkedWeeks).values(weekValues);
    }
  }
}

/** Toggle one (rowId, weekNumber) actual-progress mark on/off — incremental,
 * not a full delete-reinsert like Penawaran's jadwal editor, since ongoing
 * week-by-week marking doesn't fit a wholesale-replace model. */
export async function toggleActualWeek(userId: string, rowId: string, weekNumber: number): Promise<void> {
  await withUserTransaction(userId, async (tx) => {
    const [existing] = await tx
      .select({ id: schema.activityScheduleMarkedWeeks.id })
      .from(schema.activityScheduleMarkedWeeks)
      .where(
        and(
          eq(schema.activityScheduleMarkedWeeks.rowId, rowId),
          eq(schema.activityScheduleMarkedWeeks.weekNumber, weekNumber),
          eq(schema.activityScheduleMarkedWeeks.isActual, 1),
        ),
      )
      .limit(1);
    if (existing) {
      await tx.delete(schema.activityScheduleMarkedWeeks).where(eq(schema.activityScheduleMarkedWeeks.id, existing.id));
    } else {
      await tx.insert(schema.activityScheduleMarkedWeeks).values({ rowId, weekNumber, isActual: 1 });
    }
  });
}

/** For manually-created projects only (no SPH schedule to take over) — lets
 * Tim Teknis build a schedule from scratch. */
export async function addScheduleRow(
  userId: string,
  projectId: string,
  input: { scheduleId?: string; activityName: string; numMonths?: number },
): Promise<ProyekJadwal[]> {
  await withUserTransaction(userId, async (tx) => {
    let scheduleId = input.scheduleId;
    if (!scheduleId) {
      const [schedule] = await tx
        .insert(schema.activitySchedules)
        .values({ projectId, numMonths: input.numMonths ?? 4, weeksPerMonth: 4 })
        .returning();
      scheduleId = schedule.id;
    }
    const existingRows = await tx.select({ id: schema.activityScheduleRows.id }).from(schema.activityScheduleRows).where(eq(schema.activityScheduleRows.scheduleId, scheduleId));
    await tx.insert(schema.activityScheduleRows).values({ scheduleId, activityName: input.activityName, sortOrder: existingRows.length });
  });
  return getProjectSchedules(userId, projectId);
}

export async function removeScheduleRow(userId: string, projectId: string, rowId: string): Promise<ProyekJadwal[]> {
  await withUserTransaction(userId, async (tx) => {
    await tx.delete(schema.activityScheduleRows).where(eq(schema.activityScheduleRows.id, rowId));
  });
  return getProjectSchedules(userId, projectId);
}

/** Changes a schedule's month count (Admin-only, matches the SPH JadwalEditor's
 * +/- control) — clips any marked weeks beyond the new max week, same as the
 * SPH-side editor does. */
export async function updateScheduleMonths(
  userId: string,
  projectId: string,
  scheduleId: string,
  numMonths: number,
): Promise<ProyekJadwal[]> {
  await withUserTransaction(userId, async (tx) => {
    const clamped = Math.max(1, numMonths);
    const [schedule] = await tx
      .update(schema.activitySchedules)
      .set({ numMonths: clamped })
      .where(eq(schema.activitySchedules.id, scheduleId))
      .returning();
    const maxWeek = clamped * schedule.weeksPerMonth;
    const rows = await tx.select({ id: schema.activityScheduleRows.id }).from(schema.activityScheduleRows).where(eq(schema.activityScheduleRows.scheduleId, scheduleId));
    const rowIds = rows.map((r) => r.id);
    if (rowIds.length) {
      await tx.delete(schema.activityScheduleMarkedWeeks).where(
        and(inArray(schema.activityScheduleMarkedWeeks.rowId, rowIds), gt(schema.activityScheduleMarkedWeeks.weekNumber, maxWeek)),
      );
    }
  });
  return getProjectSchedules(userId, projectId);
}
