/**
 * Master Data (PRD Bab 3): client companies + PICs, service catalog (with default
 * milestone templates), and employees.
 */
import {
  boolean,
  date,
  integer,
  pgTable,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { money, bookkeeping, pk, timestamps } from "./_shared";
import {
  adminAreas,
  authorities,
  documentTypes,
  employmentStatuses,
  legalBases,
  positions,
  salaryComponents,
} from "./config";

// ── 3.1 Perusahaan (Mitra) + PIC ──────────────────────────────────────────────

/** Client company (PRD Bab 3.1). Country is always Indonesia. */
export const companies = pgTable("companies", {
  id: pk(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(), // Kota
  regency: text("regency").notNull(), // Kabupaten
  adminAreaId: uuid("admin_area_id").references(() => adminAreas.id, {
    onDelete: "set null",
  }),
  country: text("country").notNull().default("Indonesia"),
  npwp: text("npwp").notNull(), // ≤16 digits, validated app/CHECK side
  email: text("email"),
  ...bookkeeping,
});

/** Narahubung / PIC — a company may have more than one (PRD Bab 3.1). */
export const companyContacts = pgTable("company_contacts", {
  id: pk(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  isPrimary: boolean("is_primary").notNull().default(false),
  ...bookkeeping,
});

// ── Milestone templates (PRD Bab 6.2 / 9.4) ──────────────────────────────────

/**
 * Default milestone template, referenced by a service so projects can preload
 * a starting checklist (then customise). The 12-step environmental template is
 * seeded (sql/seed).
 */
export const milestoneTemplates = pgTable("milestone_templates", {
  id: pk(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

/** Ordered steps within a milestone template. */
export const milestoneTemplateSteps = pgTable("milestone_template_steps", {
  id: pk(),
  templateId: uuid("template_id")
    .notNull()
    .references(() => milestoneTemplates.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  triggersTerm: boolean("triggers_term").notNull().default(false),
  ...timestamps,
});

// ── 3.2 Katalog Layanan ───────────────────────────────────────────────────────

/** Service catalog — managed master data, not free text (PRD Bab 3.2). */
export const serviceCatalog = pgTable("service_catalog", {
  id: pk(),
  name: text("name").notNull(), // e.g. "Penyusunan Pertek Air Limbah"
  documentTypeId: uuid("document_type_id").references(() => documentTypes.id, {
    onDelete: "set null",
  }),
  authorityId: uuid("authority_id").references(() => authorities.id, {
    onDelete: "set null",
  }),
  legalBasisId: uuid("legal_basis_id").references(() => legalBases.id, {
    onDelete: "set null",
  }),
  standardPrice: money("standard_price"), // optional reference price
  isRecurring: boolean("is_recurring").notNull().default(false), // Laporan Semester tag
  milestoneTemplateId: uuid("milestone_template_id").references(
    () => milestoneTemplates.id,
    { onDelete: "set null" },
  ),
  isActive: boolean("is_active").notNull().default(true),
  ...bookkeeping,
});

// ── 3.3 Karyawan ──────────────────────────────────────────────────────────────

/** Employee — source for payroll & project assignment (PRD Bab 3.3). */
export const employees = pgTable("employees", {
  id: pk(),
  name: text("name").notNull(),
  positionId: uuid("position_id").references(() => positions.id, {
    onDelete: "set null",
  }),
  employmentStatusId: uuid("employment_status_id").references(
    () => employmentStatuses.id,
    { onDelete: "set null" },
  ),
  baseSalary: money("base_salary").notNull().default("0"),
  // Bank info (optional)
  bankName: text("bank_name"),
  bankAccountHolder: text("bank_account_holder"),
  bankAccountNumber: text("bank_account_number"),
  // Tax
  npwp: text("npwp"),
  ptkpStatus: text("ptkp_status"), // e.g. TK/0, K/1 — used for manual PPh21
  joinDate: date("join_date"),
  // Contact for sending payslips (PRD Bab 5.2 — WA/email to the employee only)
  phone: text("phone"),
  email: text("email"),
  isActive: boolean("is_active").notNull().default(true),
  ...bookkeeping,
});

/** Default allowance/deduction components attached to an employee (PRD Bab 3.3). */
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
    // Optional per-employee override of the component's default value.
    overrideValue: money("override_value"),
    ...timestamps,
  },
  (t) => ({
    uqEmpComponent: unique("employee_salary_components_uq").on(
      t.employeeId,
      t.salaryComponentId,
    ),
  }),
);
