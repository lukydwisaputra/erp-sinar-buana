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
