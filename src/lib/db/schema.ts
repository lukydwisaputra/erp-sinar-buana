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

const pk = () => uuid("id").primaryKey().default(sql`gen_random_uuid()`);
const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey(),
  fullName: text("full_name").notNull(),
  passwordHash: text("password_hash"),
  role: appRole("role").notNull().default("viewer"),
  employeeId: uuid("employee_id").unique(),
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
});

// ── Katalog Layanan (db-schema/src/schema/master-data.ts) ────────────────────
// `milestone_template_id` is deliberately omitted here — this pass doesn't
// query/write it (see docs/architecture.md's Katalog note); Drizzle simply
// won't know about that column, which is fine since we never touch it.

export const serviceCatalog = pgTable("service_catalog", {
  id: pk(),
  name: text("name").notNull(),
  documentTypeId: uuid("document_type_id").references(() => documentTypes.id, { onDelete: "set null" }),
  authorityId: uuid("authority_id").references(() => authorities.id, { onDelete: "set null" }),
  legalBasisId: uuid("legal_basis_id").references(() => legalBases.id, { onDelete: "set null" }),
  standardPrice: money("standard_price"),
  isRecurring: boolean("is_recurring").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  ...bookkeeping,
});

// ── Data Karyawan (db-schema/src/schema/master-data.ts) ──────────────────────

export const employees = pgTable("employees", {
  id: pk(),
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
  number: text("number"), // assigned by trg_installments_number — never set from the app
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
  payslipId: uuid("payslip_id"),
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
  payslipId: uuid("payslip_id"),
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
