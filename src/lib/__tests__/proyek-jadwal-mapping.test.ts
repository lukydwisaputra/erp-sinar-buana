import { describe, it, expect } from "vitest";
import { toProyekJadwal, type ScheduleRow, type ScheduleRowRow, type MarkedWeekRow } from "@/lib/proyek/jadwal-mapping";

function schedule(overrides: Partial<ScheduleRow> = {}): ScheduleRow {
  return {
    id: "sched-1",
    quotationId: "quo-1",
    quotationItemId: "item-1",
    projectId: "proj-1",
    numMonths: 2,
    weeksPerMonth: 4,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as ScheduleRow;
}

function row(overrides: Partial<ScheduleRowRow> = {}): ScheduleRowRow {
  return {
    id: "row-1",
    scheduleId: "sched-1",
    activityName: "Survey Lapangan",
    sortOrder: 0,
    milestoneId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as ScheduleRowRow;
}

function mark(overrides: Partial<MarkedWeekRow> = {}): MarkedWeekRow {
  return { id: "mw-1", rowId: "row-1", weekNumber: 1, isActual: 0, ...overrides } as MarkedWeekRow;
}

describe("toProyekJadwal", () => {
  it("splits marked weeks into rencana (isActual=0) and aktual (isActual=1)", () => {
    const result = toProyekJadwal({
      schedule: schedule(),
      layananNama: "Dokumen AMDAL",
      rows: [row()],
      markedWeeks: [mark({ weekNumber: 1, isActual: 0 }), mark({ id: "mw-2", weekNumber: 3, isActual: 1 })],
    });
    expect(result.rows[0].rencana).toEqual([1]);
    expect(result.rows[0].aktual).toEqual([3]);
  });

  it("sorts rows by sortOrder and marked weeks numerically", () => {
    const result = toProyekJadwal({
      schedule: schedule(),
      layananNama: null,
      rows: [row({ id: "row-2", sortOrder: 1, activityName: "B" }), row({ id: "row-1", sortOrder: 0, activityName: "A" })],
      markedWeeks: [
        mark({ id: "mw-1", rowId: "row-1", weekNumber: 3, isActual: 0 }),
        mark({ id: "mw-2", rowId: "row-1", weekNumber: 1, isActual: 0 }),
      ],
    });
    expect(result.rows.map((r) => r.kegiatan)).toEqual(["A", "B"]);
    expect(result.rows[0].rencana).toEqual([1, 3]);
  });

  it("passes through layananNama and bulan", () => {
    const result = toProyekJadwal({ schedule: schedule({ numMonths: 3 }), layananNama: "Dokumen AMDAL", rows: [], markedWeeks: [] });
    expect(result.layananNama).toBe("Dokumen AMDAL");
    expect(result.bulan).toBe(3);
  });
});
