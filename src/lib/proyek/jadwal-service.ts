import { and, eq, inArray } from "drizzle-orm";
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

/** The Deal-time "take-over" — points the SAME activity_schedules rows
 * Penawaran wrote at SPH time at the new project, rather than creating fresh
 * ones (schedules.ts: "Attached to a quotation, a project, or both (after
 * Deal)"). Runs inside the caller's transaction (createProyek), not its own. */
export async function linkQuotationSchedulesToProject(tx: Tx, quotationId: string, projectId: string): Promise<void> {
  await tx.update(schema.activitySchedules).set({ projectId }).where(eq(schema.activitySchedules.quotationId, quotationId));
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
