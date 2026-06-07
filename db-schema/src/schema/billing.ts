/**
 * Modul Dokumen Bisnis — Faktur (PRD Bab 5.1).
 *
 * Billing hierarchy: Proyek → Faktur Induk (Master Invoice) → Invoice Termin.
 * - A project may have several master invoices.
 * - A master invoice holds a user-configured term scheme (count + percentages).
 * - Installment invoices are generated one by one; each shows previous terms in
 *   the same master as deductions from Total Biaya to reach the current value.
 * - Tax math (DPP = value × 11/12, PPN = 12% × DPP, PPh23 = 2% × value) is
 *   computed and SNAPSHOT onto each installment so historical invoices stay
 *   correct if rates change later (PRD Bab 10).
 */
import { date, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { money, rate, bookkeeping, pk, timestamps } from "./_shared";
import { projects } from "./projects";
import { companies, serviceCatalog } from "./master-data";
import { bankAccounts, workflowStatuses } from "./config";

// ── A. Faktur Induk (Master Invoice) ──────────────────────────────────────────

/** Master invoice — groups billing under a project (PRD Bab 5.1.A). */
export const masterInvoices = pgTable("master_invoices", {
  id: pk(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "restrict" }),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "restrict" }),
  totalCost: money("total_cost").notNull().default("0"), // Total Biaya
  statusId: uuid("status_id").references(() => workflowStatuses.id, {
    onDelete: "set null",
  }), // Belum Lunas / Lunas (entity = 'faktur')
  notes: text("notes"),
  ...bookkeeping,
});

/** Services billed by a master invoice (PRD Bab 5.1.A — one or more). */
export const masterInvoiceServices = pgTable("master_invoice_services", {
  id: pk(),
  masterInvoiceId: uuid("master_invoice_id")
    .notNull()
    .references(() => masterInvoices.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").references(() => serviceCatalog.id, {
    onDelete: "set null",
  }),
  description: text("description"),
  ...timestamps,
});

/**
 * User-configured term scheme for a master invoice (PRD Bab 5.1.A / C).
 * Sum of percentages should be 100; enforced at generation time by trigger.
 * Optionally tied to a milestone whose completion suggests generating the termin.
 */
export const masterInvoiceTerms = pgTable("master_invoice_terms", {
  id: pk(),
  masterInvoiceId: uuid("master_invoice_id")
    .notNull()
    .references(() => masterInvoices.id, { onDelete: "cascade" }),
  label: text("label").notNull(), // e.g. "TERMIN III (Pelunasan)"
  percentage: rate("percentage").notNull(), // e.g. 40.0000
  sortOrder: integer("sort_order").notNull().default(0),
  // milestone link is on milestones.linkedMasterInvoiceId / project side; the
  // term may also be generated manually.
  ...timestamps,
});

// ── B. Invoice Termin ─────────────────────────────────────────────────────────

/**
 * Installment invoice (PRD Bab 5.1.B). `number` (INV/...) is set by the numbering
 * trigger and is immutable on edit. Tax columns are computed snapshots.
 * Previous-term deductions are derived from sibling installments of the same
 * master invoice (ordered by creation); the resulting `currentTermValue` is stored.
 */
export const installmentInvoices = pgTable("installment_invoices", {
  id: pk(),
  number: text("number"), // e.g. INV/002/05.2026 — immutable on edit
  numberYear: integer("number_year"),
  numberMonth: integer("number_month"),
  masterInvoiceId: uuid("master_invoice_id")
    .notNull()
    .references(() => masterInvoices.id, { onDelete: "cascade" }),
  termId: uuid("term_id").references(() => masterInvoiceTerms.id, {
    onDelete: "set null",
  }),
  label: text("label").notNull(), // "TERMIN III (Pelunasan)"
  date: date("date").notNull(),
  dueDate: date("due_date"), // Jatuh Tempo — editable (default = date + N days)
  bankAccountId: uuid("bank_account_id").references(() => bankAccounts.id, {
    onDelete: "set null",
  }),
  statusId: uuid("status_id").references(() => workflowStatuses.id, {
    onDelete: "set null",
  }), // Lunas / Belum Lunas (entity = 'faktur')
  paidDate: date("paid_date"),

  // Value
  currentTermValue: money("current_term_value").notNull().default("0"), // nilai termin berjalan

  // Tax snapshot (PRD Bab 10.1 / 10.2) — rounded half-up to nearest rupiah
  dpp: money("dpp").notNull().default("0"), // value × 11/12
  ppn: money("ppn").notNull().default("0"), // 12% × DPP
  pph23: money("pph23").notNull().default("0"), // 2% × value (withheld)
  totalAfterTax: money("total_after_tax").notNull().default("0"), // value + PPN − PPh23
  grossIncome: money("gross_income").notNull().default("0"), // = value (before tax)
  netIncome: money("net_income").notNull().default("0"), // value − PPh23

  notes: text("notes"),
  ...bookkeeping,
});
