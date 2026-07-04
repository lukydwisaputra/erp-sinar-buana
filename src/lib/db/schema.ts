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
// `project_id` is deliberately omitted — this pass never attaches a schedule
// to a project (Proyek stays mock), only to a quotation/quotation item.

export const activitySchedules = pgTable("activity_schedules", {
  id: pk(),
  quotationId: uuid("quotation_id").references(() => quotations.id, { onDelete: "cascade" }),
  quotationItemId: uuid("quotation_item_id").references(() => quotationItems.id, { onDelete: "cascade" }),
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
