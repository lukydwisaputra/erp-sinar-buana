/**
 * Estimasi Jadwal Rencana Kegiatan (PRD Bab 4.5 / 6.3 / 11.1).
 *
 * Built during the quotation phase as an activity × week grid, then carried into
 * the project as the weekly Gantt. The same schedule structure serves both: a
 * schedule belongs to a quotation and/or a project. Duration is configurable
 * (number of months is NOT locked; weeks-per-month adjustable). Each activity row
 * toggles which week columns it spans — the highlighted cells.
 */
import {
  integer,
  pgTable,
  smallint,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { pk, timestamps } from "./_shared";
import { quotations } from "./quotations";
import { projects, milestones } from "./projects";

/** A schedule grid. Attached to a quotation, a project, or both (after Deal). */
export const activitySchedules = pgTable("activity_schedules", {
  id: pk(),
  quotationId: uuid("quotation_id").references(() => quotations.id, {
    onDelete: "cascade",
  }),
  projectId: uuid("project_id").references(() => projects.id, {
    onDelete: "cascade",
  }),
  numMonths: smallint("num_months").notNull().default(4), // not locked to 3
  weeksPerMonth: smallint("weeks_per_month").notNull().default(4),
  ...timestamps,
});

/**
 * One activity (row) in the grid. Linked to a project milestone so the schedule
 * stays consistent with milestones and doesn't need re-entry (PRD Bab 4.5).
 */
export const activityScheduleRows = pgTable("activity_schedule_rows", {
  id: pk(),
  scheduleId: uuid("schedule_id")
    .notNull()
    .references(() => activitySchedules.id, { onDelete: "cascade" }),
  activityName: text("activity_name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  milestoneId: uuid("milestone_id").references(() => milestones.id, {
    onDelete: "set null",
  }),
  ...timestamps,
});

/**
 * A highlighted (toggled) week cell for an activity row. `weekNumber` is 1-based
 * across the whole grid (1 .. numMonths × weeksPerMonth). `isActual` separates
 * the planned grid (SPH) from realised progress (project) — PRD Bab 6.3.
 */
export const activityScheduleMarkedWeeks = pgTable(
  "activity_schedule_marked_weeks",
  {
    id: pk(),
    rowId: uuid("row_id")
      .notNull()
      .references(() => activityScheduleRows.id, { onDelete: "cascade" }),
    weekNumber: smallint("week_number").notNull(),
    isActual: integer("is_actual").notNull().default(0), // 0 = rencana, 1 = aktual
  },
  (t) => ({
    uqMark: unique("activity_schedule_marked_weeks_uq").on(
      t.rowId,
      t.weekNumber,
      t.isActual,
    ),
  }),
);
