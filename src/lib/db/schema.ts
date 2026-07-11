/**
 * Local mirror of the tables the Next app queries directly, sourced from
 * `db-schema/src/schema/{auth,master-data}.ts`.
 *
 * `db-schema/` is the source of truth for DDL (migrations, RLS, triggers) and
 * is deliberately its own standalone package (own package.json/lockfile), not
 * an npm workspace member — importing its Drizzle table objects directly here
 * would pull in a second, differently-resolved copy of `drizzle-orm` and the
 * generic column types don't unify across the two module instances. Rather
 * than merging the repo into a workspace, this file re-declares just the
 * handful of tables the Next app actually queries. Keep column names/types in
 * sync with `db-schema/src/schema/*.ts` by hand; the SQL migrations there
 * remain authoritative.
 */
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  integer,
  numeric,
  pgEnum,
  pgSchema,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/** Money column factory — IDR amounts. numeric(18,2) (db-schema/src/schema/_shared.ts `money`). */
const money = (name: string) => numeric(name, { precision: 18, scale: 2 });
/** Rate/percentage/multiplier column factory (db-schema/src/schema/_shared.ts `rate`). */
const rate = (name: string) => numeric(name, { precision: 9, scale: 4 });

// Non-Supabase auth stub (infra/postgres/init/00-roles.sql) — id + email only.
// Query-only here: Drizzle never migrates/owns this schema (db-schema/src/schema/auth.ts).
const authSchema = pgSchema("auth");
export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
  email: text("email").unique(),
});

export const appRole = pgEnum("app_role", [
  "admin",
  "keuangan",
  "sales",
  "tim_teknis",
  "viewer",
]);

export const authTokenType = pgEnum("auth_token_type", ["invite", "reset"]);

export const kelengkapanItemStatus = pgEnum("kelengkapan_item_status", ["ada", "tidak"]);

const pk = () => uuid("id").primaryKey().default(sql`gen_random_uuid()`);
const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey(),
  fullName: text("full_name").notNull(),
  passwordHash: text("password_hash"),
  role: appRole("role").notNull().default("viewer"),
  employeeId: uuid("employee_id").unique(),
  clientCompanyId: uuid("client_company_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: pk(),
  userId: uuid("user_id")
    .notNull()
    .references(() => userProfiles.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
});

export const authTokens = pgTable("auth_tokens", {
  id: pk(),
  userId: uuid("user_id")
    .notNull()
    .references(() => userProfiles.id, { onDelete: "cascade" }),
  type: authTokenType("type").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: createdAt(),
});

const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

// Bookkeeping columns shared by every db-schema business table
// (db-schema/src/schema/_shared.ts `bookkeeping`).
const bookkeeping = {
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedBy: uuid("deleted_by"),
};

export const companies = pgTable("companies", {
  id: pk(),
  number: text("number"), // assigned by trg_companies_number — never set from the app
  numberYear: integer("number_year"),
  numberMonth: integer("number_month"),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  regency: text("regency").notNull(),
  adminAreaId: uuid("admin_area_id"),
  country: text("country").notNull().default("Indonesia"),
  npwp: text("npwp").notNull(),
  email: text("email"),
  isActive: boolean("is_active").notNull().default(true),
  ...bookkeeping,
});

export const companyContacts = pgTable("company_contacts", {
  id: pk(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  position: text("position"),
  isPrimary: boolean("is_primary").notNull().default(false),
  ...bookkeeping,
});

// ── Konfigurasi > Daftar Pilihan lookup tables (db-schema/src/schema/config.ts) ──

/** Columns shared by every simple managed dropdown list (config.ts `lookup`). */
const lookup = {
  id: pk(),
  label: text("label").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
};

export const documentTypes = pgTable("document_types", { ...lookup });
export const authorities = pgTable("authorities", { ...lookup });
export const legalBases = pgTable("legal_bases", { ...lookup });
export const adminAreas = pgTable("admin_areas", { ...lookup });
export const positions = pgTable("positions", { ...lookup });

export const employmentStatuses = pgTable("employment_statuses", {
  ...lookup,
  multiplier: rate("multiplier").notNull().default("1"),
});

export const salaryComponentKind = pgEnum("salary_component_kind", [
  "tunjangan",
  "potongan",
]);
export const salaryCalcType = pgEnum("salary_calc_type", [
  "nominal",
  "persentase",
  "per_hari",
]);

export const salaryComponents = pgTable("salary_components", {
  ...lookup,
  kind: salaryComponentKind("kind").notNull(),
  calcType: salaryCalcType("calc_type").notNull().default("nominal"),
  defaultValue: money("default_value").notNull().default("0"),
  isEmployerPortion: boolean("is_employer_portion").notNull().default(false),
});

export const bankAccounts = pgTable("bank_accounts", {
  ...lookup,
  bankName: text("bank_name").notNull(),
  accountHolder: text("account_holder").notNull(),
  accountNumber: text("account_number").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
});

// ── Workflow Status (db-schema/src/schema/config.ts) — Konfigurasi's own
// "Workflow Status" tab isn't wired (still fully mock); this table is only
// mirrored here because quotations.status_id is a real FK into it.

export const workflowEntity = pgEnum("workflow_entity", [
  "penawaran",
  "proyek",
  "faktur",
  "penggajian",
  "milestone",
]);
export const statusSystemRole = pgEnum("status_system_role", [
  "SELESAI",
  "LUNAS",
  "DIBAYAR",
  "BATAL",
]);

export const workflowStatuses = pgTable("workflow_statuses", {
  ...lookup,
  entity: workflowEntity("entity").notNull(),
  systemRole: statusSystemRole("system_role"),
  color: text("color"),
  isDefault: boolean("is_default").notNull().default(false),
  isSystem: boolean("is_system").notNull().default(false),
});

// ── Katalog Layanan (db-schema/src/schema/master-data.ts) ────────────────────

export const milestoneTemplates = pgTable("milestone_templates", {
  id: pk(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const milestoneTemplateSteps = pgTable("milestone_template_steps", {
  id: pk(),
  templateId: uuid("template_id").notNull().references(() => milestoneTemplates.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  triggersTerm: boolean("triggers_term").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const serviceCatalog = pgTable("service_catalog", {
  id: pk(),
  number: text("number"), // assigned by trg_service_catalog_number — never set from the app
  numberYear: integer("number_year"),
  numberMonth: integer("number_month"),
  name: text("name").notNull(),
  documentTypeId: uuid("document_type_id").references(() => documentTypes.id, { onDelete: "set null" }),
  authorityId: uuid("authority_id").references(() => authorities.id, { onDelete: "set null" }),
  legalBasisId: uuid("legal_basis_id").references(() => legalBases.id, { onDelete: "set null" }),
  standardPrice: money("standard_price"),
  isRecurring: boolean("is_recurring").notNull().default(false),
  milestoneTemplateId: uuid("milestone_template_id").references(() => milestoneTemplates.id, { onDelete: "set null" }),
  isActive: boolean("is_active").notNull().default(true),
  ...bookkeeping,
});

// ── Data Karyawan (db-schema/src/schema/master-data.ts) ──────────────────────

export const employees = pgTable("employees", {
  id: pk(),
  number: text("number"), // assigned by trg_employees_number — never set from the app
  numberYear: integer("number_year"),
  numberMonth: integer("number_month"),
  name: text("name").notNull(),
  positionId: uuid("position_id").references(() => positions.id, { onDelete: "set null" }),
  employmentStatusId: uuid("employment_status_id").references(
    () => employmentStatuses.id,
    { onDelete: "set null" },
  ),
  baseSalary: money("base_salary").notNull().default("0"),
  bankName: text("bank_name"),
  bankAccountHolder: text("bank_account_holder"),
  bankAccountNumber: text("bank_account_number"),
  npwp: text("npwp"),
  ptkpStatus: text("ptkp_status"),
  joinDate: date("join_date"),
  phone: text("phone"),
  email: text("email"),
  isActive: boolean("is_active").notNull().default(true),
  ...bookkeeping,
});

export const employeeSalaryComponents = pgTable(
  "employee_salary_components",
  {
    id: pk(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    salaryComponentId: uuid("salary_component_id")
      .notNull()
      .references(() => salaryComponents.id, { onDelete: "restrict" }),
    overrideValue: money("override_value"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique("employee_salary_components_emp_component_uq").on(t.employeeId, t.salaryComponentId)],
);

// ── Kelengkapan Administrasi (db-schema/src/schema/kelengkapan.ts) ───────────

export const kelengkapanTemplates = pgTable("kelengkapan_templates", {
  id: pk(),
  number: text("number"), // assigned by trg_kelengkapan_templates_number — never set from the app
  numberYear: integer("number_year"),
  numberMonth: integer("number_month"),
  name: text("name").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const kelengkapanTemplateItems = pgTable("kelengkapan_template_items", {
  id: pk(),
  templateId: uuid("template_id").notNull().references(() => kelengkapanTemplates.id, { onDelete: "cascade" }),
  persyaratan: text("persyaratan").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ── Penawaran / SPH (db-schema/src/schema/quotations.ts) ─────────────────────

export const quotations = pgTable("quotations", {
  id: pk(),
  number: text("number"), // assigned by trg_quotations_number — never set from the app
  numberYear: integer("number_year"),
  numberMonth: integer("number_month"),
  date: date("date").notNull(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "restrict" }),
  contactId: uuid("contact_id").references(() => companyContacts.id, { onDelete: "set null" }),
  statusId: uuid("status_id").references(() => workflowStatuses.id, { onDelete: "set null" }),
  subject: text("subject"),
  validityDays: integer("validity_days"),
  notes: text("notes"),
  totalAmount: money("total_amount").notNull().default("0"),
  openingSentence: text("opening_sentence"),
  attachmentNote: text("attachment_note"),
  recipientTitle: text("recipient_title"),
  rincianActive: boolean("rincian_active").notNull().default(true),
  ppnActive: boolean("ppn_active").notNull().default(false),
  ppnPercent: rate("ppn_percent"),
  pph23Active: boolean("pph23_active").notNull().default(false),
  pph23Percent: rate("pph23_percent"),
  picOverrideActive: boolean("pic_override_active").notNull().default(false),
  picOverrideName: text("pic_override_name"),
  picOverridePosition: text("pic_override_position"),
  ...bookkeeping,
});

export const quotationItems = pgTable("quotation_items", {
  id: pk(),
  quotationId: uuid("quotation_id").notNull().references(() => quotations.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").references(() => serviceCatalog.id, { onDelete: "set null" }),
  description: text("description").notNull(),
  unitPrice: money("unit_price").notNull().default("0"),
  quantity: rate("quantity").notNull().default("1"),
  unit: text("unit"),
  lineTotal: money("line_total").notNull().default("0"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const quotationTermScheme = pgTable("quotation_term_scheme", {
  id: pk(),
  quotationId: uuid("quotation_id").notNull().references(() => quotations.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  percentage: rate("percentage").notNull(),
  milestoneTriggerLabel: text("milestone_trigger_label"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const quotationRabPersonnel = pgTable("quotation_rab_personnel", {
  id: pk(),
  quotationId: uuid("quotation_id").notNull().references(() => quotations.id, { onDelete: "cascade" }),
  quotationItemId: uuid("quotation_item_id").references(() => quotationItems.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  volumeMonths: rate("volume_months").notNull().default("1"),
  unitPrice: money("unit_price").notNull().default("0"),
  amount: money("amount").notNull().default("0"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const quotationRabDirectCosts = pgTable("quotation_rab_direct_costs", {
  id: pk(),
  quotationId: uuid("quotation_id").notNull().references(() => quotations.id, { onDelete: "cascade" }),
  quotationItemId: uuid("quotation_item_id").references(() => quotationItems.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  amount: money("amount").notNull().default("0"),
  sortOrder: integer("sort_order").notNull().default(0),
});

// Kelengkapan attached to an SPH — a SNAPSHOT taken at attach time, not a live
// join to kelengkapan_templates (see db-schema/src/schema/quotations.ts).
export const quotationKelengkapan = pgTable("quotation_kelengkapan", {
  id: pk(),
  quotationId: uuid("quotation_id").notNull().references(() => quotations.id, { onDelete: "cascade" }),
  templateId: uuid("template_id").references(() => kelengkapanTemplates.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const quotationKelengkapanItems = pgTable("quotation_kelengkapan_items", {
  id: pk(),
  quotationKelengkapanId: uuid("quotation_kelengkapan_id").notNull().references(() => quotationKelengkapan.id, { onDelete: "cascade" }),
  persyaratan: text("persyaratan").notNull(),
  status: kelengkapanItemStatus("status"),
  keterangan: text("keterangan"),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ── Estimasi Jadwal (db-schema/src/schema/schedules.ts) ──────────────────────
// `projectId` attaches the SAME rows created at Penawaran-time to a project
// after Deal (schedules.ts's own comment: "Attached to a quotation, a
// project, or both (after Deal)") — see proyek/jadwal-service.ts.

export const activitySchedules = pgTable("activity_schedules", {
  id: pk(),
  quotationId: uuid("quotation_id").references(() => quotations.id, { onDelete: "cascade" }),
  quotationItemId: uuid("quotation_item_id").references(() => quotationItems.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  numMonths: smallint("num_months").notNull().default(4),
  weeksPerMonth: smallint("weeks_per_month").notNull().default(4),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const activityScheduleRows = pgTable("activity_schedule_rows", {
  id: pk(),
  scheduleId: uuid("schedule_id").notNull().references(() => activitySchedules.id, { onDelete: "cascade" }),
  activityName: text("activity_name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  milestoneId: uuid("milestone_id").references(() => milestones.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const activityScheduleMarkedWeeks = pgTable(
  "activity_schedule_marked_weeks",
  {
    id: pk(),
    rowId: uuid("row_id").notNull().references(() => activityScheduleRows.id, { onDelete: "cascade" }),
    weekNumber: smallint("week_number").notNull(),
    isActual: integer("is_actual").notNull().default(0),
  },
  (t) => [unique("activity_schedule_marked_weeks_uq").on(t.rowId, t.weekNumber, t.isActual)],
);

// ── Manajemen Proyek (db-schema/src/schema/projects.ts) ──────────────────────

export const projectRole = pgEnum("project_role", [
  "ketua_tim",
  "anggota",
  "document_controller",
]);

export const projects = pgTable(
  "projects",
  {
    id: pk(),
    number: text("number"), // assigned by trg_projects_number — never set from the app
    numberYear: integer("number_year"),
    numberMonth: integer("number_month"),
    name: text("name").notNull(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "restrict" }),
    adminAreaId: uuid("admin_area_id").references(() => adminAreas.id, { onDelete: "set null" }),
    workYear: integer("work_year"),
    statusId: uuid("status_id").references(() => workflowStatuses.id, { onDelete: "set null" }),
    contractValue: money("contract_value").notNull().default("0"),
    quotationId: uuid("quotation_id").references(() => quotations.id, { onDelete: "set null" }),
    recurringPeriod: smallint("recurring_period"),
    ...bookkeeping,
  },
  (t) => [unique("projects_recurring_uq").on(t.companyId, t.workYear, t.recurringPeriod)],
);

export const projectServices = pgTable("project_services", {
  id: pk(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").references(() => serviceCatalog.id, { onDelete: "set null" }),
  documentTypeLabel: text("document_type_label"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const projectAssignees = pgTable(
  "project_assignees",
  {
    id: pk(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
    role: projectRole("role").notNull().default("anggota"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique("project_assignees_uq").on(t.projectId, t.employeeId, t.role)],
);

export const milestones = pgTable("milestones", {
  id: pk(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id").references((): AnyPgColumn => milestones.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  assigneeEmployeeId: uuid("assignee_employee_id").references(() => employees.id, { onDelete: "set null" }),
  statusId: uuid("status_id").references(() => workflowStatuses.id, { onDelete: "set null" }),
  targetDate: date("target_date"),
  actualDate: date("actual_date"),
  sortOrder: integer("sort_order").notNull().default(0),
  triggersTerm: boolean("triggers_term").notNull().default(false),
  linkedProjectServiceId: uuid("linked_project_service_id").references(() => projectServices.id, { onDelete: "set null" }),
  linkedMasterInvoiceId: uuid("linked_master_invoice_id").references((): AnyPgColumn => masterInvoices.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const milestoneAssignees = pgTable(
  "milestone_assignees",
  {
    id: pk(),
    milestoneId: uuid("milestone_id").notNull().references(() => milestones.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique("milestone_assignees_uq").on(t.milestoneId, t.employeeId)],
);

export const projectComments = pgTable("project_comments", {
  id: pk(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  milestoneId: uuid("milestone_id").references(() => milestones.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").references(() => userProfiles.id, { onDelete: "set null" }),
  body: text("body").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const commentMentions = pgTable(
  "comment_mentions",
  {
    id: pk(),
    commentId: uuid("comment_id").notNull().references(() => projectComments.id, { onDelete: "cascade" }),
    mentionedUserId: uuid("mentioned_user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [unique("comment_mentions_uq").on(t.commentId, t.mentionedUserId)],
);

// `project_status_log` is written only by a trigger (fn_project_status_log,
// SECURITY DEFINER) — the app never inserts into it directly, only reads.
export const projectStatusLog = pgTable("project_status_log", {
  id: pk(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  fromStatusId: uuid("from_status_id").references(() => workflowStatuses.id, { onDelete: "set null" }),
  toStatusId: uuid("to_status_id").references(() => workflowStatuses.id, { onDelete: "set null" }),
  changedBy: uuid("changed_by").references(() => userProfiles.id, { onDelete: "set null" }),
  changedAt: createdAt(),
});

// ── Realisasi RAB / Profitabilitas (db-schema/src/schema/profitability.ts) ───
// `cashflowEntryId` is deliberately omitted — Arus Kas stays mock, so this
// pass never links a realisasi row to a real cashflow entry.

export const rabCategory = pgEnum("rab_category", ["personil_a", "langsung_b"]);

export const rabActuals = pgTable("rab_actuals", {
  id: pk(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  rabCategory: rabCategory("rab_category").notNull(),
  rabLineLabel: text("rab_line_label"),
  amount: money("amount").notNull().default("0"),
  date: date("date").notNull(),
  note: text("note"),
  ...bookkeeping,
});

// ── Faktur — Faktur Induk / Invoice Termin (db-schema/src/schema/billing.ts) ──
// Billing hierarchy: Proyek → Faktur Induk (master_invoices) → Invoice Termin
// (installment_invoices). Numbering ('INV') uses the same assign_document_number
// trigger as Penawaran's 'SPH' numbering. Payment automation (LUNAS -> cashflow
// + tax entries, master-invoice roll-up; BATAL -> cancel/cleanup) is handled
// entirely by DB triggers (fn_installment_validate/fn_installment_after_change)
// — the app only ever UPDATEs installment_invoices.status_id.

export const masterInvoices = pgTable("master_invoices", {
  id: pk(),
  number: text("number"), // assigned by trg_master_invoices_number — never set from the app
  numberYear: integer("number_year"),
  numberMonth: integer("number_month"),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "restrict" }),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "restrict" }),
  totalCost: money("total_cost").notNull().default("0"),
  statusId: uuid("status_id").references(() => workflowStatuses.id, { onDelete: "set null" }),
  notes: text("notes"),
  ...bookkeeping,
});

export const masterInvoiceServices = pgTable("master_invoice_services", {
  id: pk(),
  masterInvoiceId: uuid("master_invoice_id").notNull().references(() => masterInvoices.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").references(() => serviceCatalog.id, { onDelete: "set null" }),
  description: text("description"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const masterInvoiceTerms = pgTable("master_invoice_terms", {
  id: pk(),
  masterInvoiceId: uuid("master_invoice_id").notNull().references(() => masterInvoices.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  percentage: rate("percentage").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const installmentInvoices = pgTable("installment_invoices", {
  id: pk(),
  number: text("number"), // legacy/unused — a termin's displayed number is derived app-side from its Induk, not trigger-assigned
  numberYear: integer("number_year"),
  numberMonth: integer("number_month"),
  masterInvoiceId: uuid("master_invoice_id").notNull().references(() => masterInvoices.id, { onDelete: "cascade" }),
  termId: uuid("term_id").references(() => masterInvoiceTerms.id, { onDelete: "set null" }),
  label: text("label").notNull(),
  date: date("date").notNull(),
  dueDate: date("due_date"),
  bankAccountId: uuid("bank_account_id").references(() => bankAccounts.id, { onDelete: "set null" }),
  statusId: uuid("status_id").references(() => workflowStatuses.id, { onDelete: "set null" }),
  paidDate: date("paid_date"),
  currentTermValue: money("current_term_value").notNull().default("0"),
  dpp: money("dpp").notNull().default("0"),
  ppn: money("ppn").notNull().default("0"),
  pph23: money("pph23").notNull().default("0"),
  totalAfterTax: money("total_after_tax").notNull().default("0"),
  grossIncome: money("gross_income").notNull().default("0"),
  netIncome: money("net_income").notNull().default("0"),
  notes: text("notes"),
  ...bookkeeping,
});

// ── Penggajian — Payslip (db-schema/src/schema/payroll.ts) ──────────────────
// Numbering ('GAJ') uses the same assign_document_number trigger as SPH/INV.
// Payment automation (DIBAYAR -> cashflow + tax entries; BATAL -> cancel/
// cleanup) is handled entirely by fn_payslip_after_change — the app only
// ever UPDATEs payslips.status_id. "Batch" has no DB table of its own —
// payslips sharing (period_start, period_end) are grouped at read time.

export const payslips = pgTable("payslips", {
  id: pk(),
  number: text("number"), // assigned by trg_payslips_number — never set from the app
  numberYear: integer("number_year"),
  numberMonth: integer("number_month"),
  employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "restrict" }),
  positionSnapshot: text("position_snapshot"),
  employmentStatusSnapshot: text("employment_status_snapshot"),
  multiplierSnapshot: rate("multiplier_snapshot").notNull().default("1"),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  plannedPayDate: date("planned_pay_date"),
  statusId: uuid("status_id").references(() => workflowStatuses.id, { onDelete: "set null" }),
  paidDate: date("paid_date"),
  baseSalary: money("base_salary").notNull().default("0"),
  baseEffective: money("base_effective").notNull().default("0"),
  overtimeAmount: money("overtime_amount").notNull().default("0"),
  bonusAmount: money("bonus_amount").notNull().default("0"),
  pph21Amount: money("pph21_amount").notNull().default("0"),
  grossPay: money("gross_pay").notNull().default("0"),
  netPay: money("net_pay").notNull().default("0"),
  notes: text("notes"),
  ...bookkeeping,
});

export const payslipComponents = pgTable("payslip_components", {
  id: pk(),
  payslipId: uuid("payslip_id").notNull().references(() => payslips.id, { onDelete: "cascade" }),
  salaryComponentId: uuid("salary_component_id").references(() => salaryComponents.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  kind: salaryComponentKind("kind").notNull(),
  amount: money("amount").notNull().default("0"),
  isEmployerPortion: boolean("is_employer_portion").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ── Arus Kas — read-only visibility (db-schema/src/schema/cashflow.ts) ───────
// Only wired enough to list real rows (incl. those the Faktur/payroll triggers
// generate) — manual-entry CRUD/forecast stay out of scope for this pass.

export const cashflowType = pgEnum("cashflow_type", ["kredit", "debit"]);
export const cashflowSource = pgEnum("cashflow_source", ["manual", "faktur", "penggajian", "pajak"]);
export const cashflowTaxComponent = pgEnum("cashflow_tax_component", [
  "jasa", "ppn_keluaran", "pph23_dipotong", "pph21", "bpjs", "bonus",
]);
export const cashflowCategorySystemKey = pgEnum("cashflow_category_system_key", [
  "FAKTUR", "PENGGAJIAN", "PAJAK", "BPJS", "BONUS",
]);
export const expenseNature = pgEnum("expense_nature", ["HPP", "OPERASIONAL", "NON_LABA_RUGI"]);

export const cashflowCategories = pgTable("cashflow_categories", {
  ...lookup,
  systemKey: cashflowCategorySystemKey("system_key"),
  expenseNature: expenseNature("expense_nature").notNull().default("OPERASIONAL"),
  isSystem: boolean("is_system").notNull().default(false),
});

export const cashflowEntries = pgTable("cashflow_entries", {
  id: pk(),
  type: cashflowType("type").notNull(),
  date: date("date").notNull(),
  amount: money("amount").notNull().default("0"),
  categoryId: uuid("category_id").references(() => cashflowCategories.id, { onDelete: "restrict" }),
  source: cashflowSource("source").notNull().default("manual"),
  taxComponent: cashflowTaxComponent("tax_component"),
  description: text("description"),
  isLocked: boolean("is_locked").notNull().default(false),
  isCancelled: boolean("is_cancelled").notNull().default(false),
  installmentInvoiceId: uuid("installment_invoice_id").references(() => installmentInvoices.id, { onDelete: "set null" }),
  payslipId: uuid("payslip_id").references(() => payslips.id, { onDelete: "set null" }),
  taxEntryId: uuid("tax_entry_id").references((): AnyPgColumn => taxEntries.id, { onDelete: "set null" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  ...bookkeeping,
});

// ── Pajak — read-only visibility (db-schema/src/schema/tax.ts) ──────────────
// Admin/Keuangan only (tax_sel has no viewer read, unlike cashflow_sel).

export const taxType = pgEnum("tax_type", [
  "ppn_keluaran", "ppn_masukan", "pph23_dipotong", "pph21", "bpjs_kesehatan", "bpjs_ketenagakerjaan",
]);
export const taxNature = pgEnum("tax_nature", ["kewajiban", "kredit"]);
export const taxSettlementStatus = pgEnum("tax_settlement_status", ["belum_disetor", "terlambat", "sudah_disetor"]);

export const taxEntries = pgTable("tax_entries", {
  id: pk(),
  taxType: taxType("tax_type").notNull(),
  nature: taxNature("nature").notNull(),
  taxPeriod: date("tax_period").notNull(),
  amount: money("amount").notNull().default("0"),
  installmentInvoiceId: uuid("installment_invoice_id").references(() => installmentInvoices.id, { onDelete: "set null" }),
  payslipId: uuid("payslip_id").references(() => payslips.id, { onDelete: "set null" }),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
  employeeId: uuid("employee_id").references(() => employees.id, { onDelete: "set null" }),
  dueDate: date("due_date"),
  settlementStatus: taxSettlementStatus("settlement_status").notNull().default("belum_disetor"),
  settledDate: date("settled_date"),
  ntpn: text("ntpn"),
  proofAttachmentUrl: text("proof_attachment_url"),
  buktiPotongReceived: boolean("bukti_potong_received").notNull().default(false),
  buktiPotongAttachmentUrl: text("bukti_potong_attachment_url"),
  notes: text("notes"),
  ...bookkeeping,
});

// ── Pengiriman Dokumen (db-schema/src/schema/{config,settings,deliveries}.ts) ─

export const messageChannel = pgEnum("message_channel", ["email", "whatsapp"]);
export const businessDocumentType = pgEnum("business_document_type", [
  "sph", "invoice", "slip_gaji",
]);
export const documentDeliveryStatus = pgEnum("document_delivery_status", [
  "queued", "sent", "failed",
]);

export const messageTemplates = pgTable("message_templates", {
  id: pk(),
  channel: messageChannel("channel").notNull(),
  documentType: businessDocumentType("document_type").notNull(),
  subject: text("subject"),
  body: text("body").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const terminTemplates = pgTable("termin_templates", {
  id: pk(),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const terminTemplateSteps = pgTable("termin_template_steps", {
  id: pk(),
  templateId: uuid("template_id").notNull().references(() => terminTemplates.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  percentage: rate("percentage").notNull(),
  milestoneTriggerLabel: text("milestone_trigger_label"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const pdfTemplates = pgTable("pdf_templates", {
  id: pk(),
  name: text("name").notNull(),
  documentType: businessDocumentType("document_type").notNull(),
  headerNote: text("header_note").notNull().default(""),
  footerNote: text("footer_note").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const emailAccounts = pgTable("email_accounts", {
  singleton: boolean("singleton").notNull().default(true).primaryKey(),
  host: text("host"),
  port: integer("port"),
  username: text("username"),
  passwordEncrypted: text("password_encrypted"),
  fromNama: text("from_nama"),
  fromEmail: text("from_email"),
  isConfigured: boolean("is_configured").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const documentDeliveries = pgTable("document_deliveries", {
  id: pk(),
  channel: messageChannel("channel").notNull(),
  documentType: businessDocumentType("document_type").notNull(),
  quotationId: uuid("quotation_id").references(() => quotations.id, { onDelete: "cascade" }),
  installmentInvoiceId: uuid("installment_invoice_id").references(() => installmentInvoices.id, { onDelete: "cascade" }),
  payslipId: uuid("payslip_id").references(() => payslips.id, { onDelete: "cascade" }),
  documentNumber: text("document_number").notNull(),
  recipientName: text("recipient_name").notNull(),
  recipientContact: text("recipient_contact").notNull(),
  status: documentDeliveryStatus("status").notNull().default("queued"),
  error: text("error"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdBy: uuid("created_by").references(() => userProfiles.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => ({
  exactlyOneOwnerChk: check(
    "document_deliveries_exactly_one_owner_chk",
    sql`num_nonnulls(${t.quotationId}, ${t.installmentInvoiceId}, ${t.payslipId}) = 1`,
  ),
}));

// ── Dasbor / Tarif config (db-schema/src/schema/settings.ts) ────────────────
// Both tables already existed pre-migrated (0001_profitability_dashboard.sql)
// but had no Drizzle mirror at all until Dasbor's wiring pass needed them.

export const corpTaxMethod = pgEnum("corp_tax_method", ["final_0_5", "badan_22"]);

export const companyProfile = pgTable("company_profile", {
  singleton: boolean("singleton").notNull().default(true).primaryKey(),
  logoUrl: text("logo_url"),
  legalName: text("legal_name").notNull(),
  tagline: text("tagline"),
  city: text("city"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  npwp: text("npwp"),
  isPkp: boolean("is_pkp").notNull().default(true),
  defaultSignerEmployeeId: uuid("default_signer_employee_id").references(() => employees.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const taxSettings = pgTable("tax_settings", {
  singleton: boolean("singleton").notNull().default(true).primaryKey(),
  ppnRate: rate("ppn_rate").notNull().default("12"),
  ppnDppNumerator: integer("ppn_dpp_numerator").notNull().default(11),
  ppnDppDenominator: integer("ppn_dpp_denominator").notNull().default(12),
  pph23Rate: rate("pph23_rate").notNull().default("2"),
  pph21SetorDay: smallint("pph21_setor_day").notNull().default(10),
  pph21LaporDay: smallint("pph21_lapor_day").notNull().default(20),
  pph23SetorDay: smallint("pph23_setor_day").notNull().default(10),
  pph23LaporDay: smallint("pph23_lapor_day").notNull().default(20),
  ppnSetorDay: smallint("ppn_setor_day").notNull().default(31),
  bpjsSetorDay: smallint("bpjs_setor_day").notNull().default(10),
  invoiceDueDays: integer("invoice_due_days").notNull().default(14),
  quotationValidityDays: integer("quotation_validity_days").notNull().default(30),
  corpTaxMethod: corpTaxMethod("corp_tax_method").notNull().default("final_0_5"),
  corpTaxRate: rate("corp_tax_rate").notNull().default("0.5"),
  umkmThreshold: money("umkm_threshold").notNull().default("4800000000"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const dashboardSettings = pgTable("dashboard_settings", {
  singleton: boolean("singleton").notNull().default(true).primaryKey(),
  projectMarginThreshold: rate("project_margin_threshold").notNull().default("0.8"),
  forecastHorizonDays: integer("forecast_horizon_days").notNull().default(90),
  stalledProjectDays: integer("stalled_project_days").notNull().default(30),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const privacySettings = pgTable("privacy_settings", {
  singleton: boolean("singleton").notNull().default(true).primaryKey(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const numberingSettings = pgTable("numbering_settings", {
  singleton: boolean("singleton").notNull().default(true).primaryKey(),
  sphFormat: text("sph_format").notNull().default("SPH/{seq}/{month}.{year}"),
  invFormat: text("inv_format").notNull().default("INV/{seq}/{year}"), // Faktur Induk resets yearly, not monthly
  gajFormat: text("gaj_format").notNull().default("GAJ/{seq}/{month}.{year}"),
  pryFormat: text("pry_format").notNull().default("PRY/{seq}"),
  prsFormat: text("prs_format").notNull().default("PRS/{seq}"),
  klgFormat: text("klg_format").notNull().default("KLG/{seq}"),
  fkiFormat: text("fki_format").notNull().default("FKI/{seq}"),
  lynFormat: text("lyn_format").notNull().default("LYN/{seq}"),
  kryFormat: text("kry_format").notNull().default("KRY/{seq}"),
  seqPadding: smallint("seq_padding").notNull().default(3),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// notification_type has more kinds seeded (tax_due/invoice_due/...) than the
// app currently produces — only "mention" is wired (src/lib/notifications/
// service.ts); the rest stay dormant until those Dasbor alert kinds are ever
// migrated from live-computed to persisted+pushed.
export const notificationType = pgEnum("notification_type", [
  "tax_due",
  "invoice_due",
  "mention",
  "semester_report_due",
  "milestone_term_ready",
  "project_over_budget",
  "milestone_slipping",
  "project_stalled",
  "pph23_bukti_potong_missing",
]);

export const notifications = pgTable("notifications", {
  id: pk(),
  userId: uuid("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  type: notificationType("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  linkPath: text("link_path"),
  isRead: boolean("is_read").notNull().default(false),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  sentEmailAt: timestamp("sent_email_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
