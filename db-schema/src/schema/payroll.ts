/**
 * Penggajian / Slip Gaji (PRD Bab 5.2 / 10.3).
 *
 * gross = base_effective (base × multiplier) + allowances + overtime + bonus.
 * net (take-home) = gross − PPh21 − employee-portion deductions.
 * PPh21 is entered MANUALLY by Finance; 0 is valid (below PTKP). Slips are
 * confidential — RLS limits read to the owning employee + Finance/Admin.
 */
import { date, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { boolean, integer } from "drizzle-orm/pg-core";
import { money, rate, bookkeeping, pk, timestamps } from "./_shared";
import { salaryComponentKind } from "./enums";
import { employees } from "./master-data";
import { salaryComponents, workflowStatuses } from "./config";

/** A payslip for one employee over a custom date range (PRD Bab 5.2). */
export const payslips = pgTable("payslips", {
  id: pk(),
  number: text("number"), // auto-generated ID
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "restrict" }),
  // Snapshots so the slip stays accurate if master data changes later.
  positionSnapshot: text("position_snapshot"),
  employmentStatusSnapshot: text("employment_status_snapshot"),
  multiplierSnapshot: rate("multiplier_snapshot").notNull().default("1"),

  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  statusId: uuid("status_id").references(() => workflowStatuses.id, {
    onDelete: "set null",
  }), // Menunggu Pembayaran / Sudah Dibayar (entity = 'penggajian')
  paidDate: date("paid_date"),

  baseSalary: money("base_salary").notNull().default("0"), // gaji pokok
  baseEffective: money("base_effective").notNull().default("0"), // × multiplier
  overtimeAmount: money("overtime_amount").notNull().default("0"),
  bonusAmount: money("bonus_amount").notNull().default("0"),
  pph21Amount: money("pph21_amount").notNull().default("0"), // manual, 0 valid

  grossPay: money("gross_pay").notNull().default("0"), // Penggajian Kotor
  netPay: money("net_pay").notNull().default("0"), // take-home

  notes: text("notes"),
  ...bookkeeping,
});

/**
 * Allowance/deduction lines on a payslip (PRD Bab 5.2). Snapshot of the salary
 * component at issue time. `isEmployerPortion` lines (e.g. BPJS employer) do not
 * reduce take-home and are remitted separately via the Tax Center (Bab 10.5).
 */
export const payslipComponents = pgTable("payslip_components", {
  id: pk(),
  payslipId: uuid("payslip_id")
    .notNull()
    .references(() => payslips.id, { onDelete: "cascade" }),
  salaryComponentId: uuid("salary_component_id").references(
    () => salaryComponents.id,
    { onDelete: "set null" },
  ),
  name: text("name").notNull(), // snapshot label
  kind: salaryComponentKind("kind").notNull(),
  amount: money("amount").notNull().default("0"),
  isEmployerPortion: boolean("is_employer_portion").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});
