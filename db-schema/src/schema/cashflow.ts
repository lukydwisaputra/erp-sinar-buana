/**
 * Modul Arus Kas / Cashflow (PRD Bab 7).
 *
 * Pemasukan=Kredit, Pengeluaran=Debit. Amounts are stored positive; direction is
 * the `type`. Automatic entries (from paid invoices, paid payslips, settled taxes)
 * are `isLocked` — not editable/deletable by hand — and follow their source's
 * status (BATAL source ⇒ entry cancelled). Each auto entry separates service
 * income from tax/bonus components via `taxComponent` (PRD Bab 7.3 / 10.4 / 10.5).
 */
import { boolean, date, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { money, bookkeeping, pk } from "./_shared";
import { cashflowSource, cashflowTaxComponent, cashflowType } from "./enums";
import { cashflowCategories } from "./config";
import { installmentInvoices } from "./billing";
import { payslips } from "./payroll";
import { taxEntries } from "./tax";
import { projects } from "./projects";

export const cashflowEntries = pgTable("cashflow_entries", {
  id: pk(),
  type: cashflowType("type").notNull(), // kredit / debit
  date: date("date").notNull(),
  amount: money("amount").notNull().default("0"), // always positive
  categoryId: uuid("category_id").references(() => cashflowCategories.id, {
    onDelete: "restrict",
  }),
  source: cashflowSource("source").notNull().default("manual"),
  taxComponent: cashflowTaxComponent("tax_component"), // sub-classification for auto rows
  description: text("description"),

  // Lock & lifecycle for automated rows.
  isLocked: boolean("is_locked").notNull().default(false),
  isCancelled: boolean("is_cancelled").notNull().default(false),

  // Source linkage (one set, depending on `source`).
  installmentInvoiceId: uuid("installment_invoice_id").references(
    () => installmentInvoices.id,
    { onDelete: "set null" },
  ),
  payslipId: uuid("payslip_id").references(() => payslips.id, {
    onDelete: "set null",
  }),
  taxEntryId: uuid("tax_entry_id").references(() => taxEntries.id, {
    onDelete: "set null",
  }),

  // Optional project tag for manual expenses recorded as Realisasi RAB (PRD Bab 7.2 / 6.8).
  projectId: uuid("project_id").references(() => projects.id, {
    onDelete: "set null",
  }),

  ...bookkeeping,
});
