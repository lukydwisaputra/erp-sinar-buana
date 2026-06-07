/**
 * Modul Manajemen Proyek — ClickUp-style (PRD Bab 6).
 *
 * A project is born from a Deal SPH (or manually), carries multiple services,
 * per-project milestones (optionally seeded from a template), assignees, a
 * timeline/Gantt (via the shared activity_schedule), and a comment/activity feed.
 */
import {
  boolean,
  date,
  integer,
  pgTable,
  smallint,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { money, bookkeeping, pk, timestamps } from "./_shared";
import { projectRole } from "./enums";
import { companies, employees, serviceCatalog } from "./master-data";
import { adminAreas, workflowStatuses } from "./config";
import { quotations } from "./quotations";
import { userProfiles } from "./auth";
import { masterInvoices } from "./billing";

/** Project header (PRD Bab 6.1). */
export const projects = pgTable(
  "projects",
  {
    id: pk(),
    name: text("name").notNull(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    adminAreaId: uuid("admin_area_id").references(() => adminAreas.id, {
      onDelete: "set null",
    }),
    workYear: integer("work_year"), // Tahun Pengerjaan
    statusId: uuid("status_id").references(() => workflowStatuses.id, {
      onDelete: "set null",
    }),
    contractValue: money("contract_value").notNull().default("0"), // = Total Penawaran
    quotationId: uuid("quotation_id").references(() => quotations.id, {
      onDelete: "set null",
    }),
    // Recurring Laporan Semester bookkeeping (PRD Bab 6.6). NULL = not a recurring
    // auto-generated report; 1/2 = semester. Guards against duplicate generation.
    recurringPeriod: smallint("recurring_period"),
    ...bookkeeping,
  },
  (t) => ({
    // One auto-generated semester project per company/year/semester.
    uqRecurring: unique("projects_recurring_uq").on(
      t.companyId,
      t.workYear,
      t.recurringPeriod,
    ),
  }),
);

/** Services contained in a project (PRD Bab 6.1 — a project may hold several). */
export const projectServices = pgTable("project_services", {
  id: pk(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").references(() => serviceCatalog.id, {
    onDelete: "set null",
  }),
  // Snapshot of the document type label at project creation (services may change).
  documentTypeLabel: text("document_type_label"),
  ...timestamps,
});

/** Project assignees with their role (PRD Bab 6.1). */
export const projectAssignees = pgTable(
  "project_assignees",
  {
    id: pk(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    role: projectRole("role").notNull().default("anggota"),
    ...timestamps,
  },
  (t) => ({
    uqAssignee: unique("project_assignees_uq").on(
      t.projectId,
      t.employeeId,
      t.role,
    ),
  }),
);

/**
 * Milestones / checklist — per project, fully editable (PRD Bab 6.2). A milestone
 * may trigger a billing term and link to a specific project service and/or master
 * invoice so the trigger generates the right Invoice Termin (PRD Bab 6.5).
 */
export const milestones = pgTable("milestones", {
  id: pk(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  assigneeEmployeeId: uuid("assignee_employee_id").references(
    () => employees.id,
    { onDelete: "set null" },
  ),
  statusId: uuid("status_id").references(() => workflowStatuses.id, {
    onDelete: "set null",
  }),
  targetDate: date("target_date"),
  actualDate: date("actual_date"),
  sortOrder: integer("sort_order").notNull().default(0),
  // Billing linkage (PRD Bab 6.5)
  triggersTerm: boolean("triggers_term").notNull().default(false),
  linkedProjectServiceId: uuid("linked_project_service_id").references(
    () => projectServices.id,
    { onDelete: "set null" },
  ),
  linkedMasterInvoiceId: uuid("linked_master_invoice_id").references(
    () => masterInvoices.id,
    { onDelete: "set null" },
  ),
  ...timestamps,
});

/** Comment / activity feed (PRD Bab 6.4). Author is a user account. */
export const projectComments = pgTable("project_comments", {
  id: pk(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").references(() => userProfiles.id, {
    onDelete: "set null",
  }),
  body: text("body").notNull(),
  ...timestamps,
});

/** @mentions inside a comment, drives mention notifications (PRD Bab 6.4 / 13). */
export const commentMentions = pgTable(
  "comment_mentions",
  {
    id: pk(),
    commentId: uuid("comment_id")
      .notNull()
      .references(() => projectComments.id, { onDelete: "cascade" }),
    mentionedUserId: uuid("mentioned_user_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    createdAt: timestamps.createdAt,
  },
  (t) => ({
    uqMention: unique("comment_mentions_uq").on(t.commentId, t.mentionedUserId),
  }),
);

/**
 * Automatic status-change log for the activity feed / audit (PRD Bab 6.4).
 * Written by a trigger on projects status changes.
 */
export const projectStatusLog = pgTable("project_status_log", {
  id: pk(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  fromStatusId: uuid("from_status_id").references(() => workflowStatuses.id, {
    onDelete: "set null",
  }),
  toStatusId: uuid("to_status_id").references(() => workflowStatuses.id, {
    onDelete: "set null",
  }),
  changedBy: uuid("changed_by").references(() => userProfiles.id, {
    onDelete: "set null",
  }),
  changedAt: timestamps.createdAt,
});
