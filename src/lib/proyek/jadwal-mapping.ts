/**
 * Pure DB-row <-> app-shape mapping for the Proyek Gantt/timeline view.
 * Reuses the SAME activity_schedules/rows/marked_weeks rows Penawaran writes
 * at SPH time (schedules.ts: "Attached to a quotation, a project, or both
 * (after Deal)") — kept free of any DB connection import, see
 * `src/lib/proyek/jadwal-service.ts` for the actual queries.
 */
import type { activitySchedules, activityScheduleRows, activityScheduleMarkedWeeks } from "@/lib/db/schema";
import type { ProyekJadwal, ProyekJadwalRow } from "@/lib/schemas/proyek";

export type ScheduleRow = typeof activitySchedules.$inferSelect;
export type ScheduleRowRow = typeof activityScheduleRows.$inferSelect;
export type MarkedWeekRow = typeof activityScheduleMarkedWeeks.$inferSelect;

function sortByOrder<T extends { sortOrder: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.sortOrder - b.sortOrder);
}

export type ToJadwalInput = {
  schedule: ScheduleRow;
  layananNama: string | null;
  rows: ScheduleRowRow[];
  markedWeeks: MarkedWeekRow[];
};

export function toProyekJadwal(input: ToJadwalInput): ProyekJadwal {
  const rowsByMark = new Map<string, MarkedWeekRow[]>();
  for (const mw of input.markedWeeks) {
    const list = rowsByMark.get(mw.rowId) ?? [];
    list.push(mw);
    rowsByMark.set(mw.rowId, list);
  }
  const rows: ProyekJadwalRow[] = sortByOrder(input.rows).map((r) => {
    const marks = rowsByMark.get(r.id) ?? [];
    return {
      id: r.id,
      kegiatan: r.activityName,
      rencana: marks.filter((m) => m.isActual === 0).map((m) => m.weekNumber).sort((a, b) => a - b),
      aktual: marks.filter((m) => m.isActual === 1).map((m) => m.weekNumber).sort((a, b) => a - b),
    };
  });
  return {
    scheduleId: input.schedule.id,
    layananNama: input.layananNama,
    bulan: input.schedule.numMonths,
    rows,
  };
}
