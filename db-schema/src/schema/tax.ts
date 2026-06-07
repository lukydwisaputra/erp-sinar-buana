/**
 * Modul Perpajakan — Tax Center (PRD Bab 10.6).
 *
 * Tracks every tax & contribution arising from financial documents, with links
 * to the source document, due dates, settlement status (🟡/🔴/🟢) and proof
 * (NTPN). Liabilities create a cashflow expense when marked "Sudah Disetor";
 * PPh23 (a tax credit) does NOT move cash. Reconciliation and SPT export are
 * read-side concerns (views/queries), not tables.
 */
import { boolean, date, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { money, bookkeeping, pk } from "./_shared";
import { taxNature, taxSettlementStatus, taxType } from "./enums";
import { installmentInvoices } from "./billing";
import { payslips } from "./payroll";
import { companies, employees } from "./master-data";

/** A single tax/contribution entry (PRD Bab 10.6). */
export const taxEntries = pgTable("tax_entries", {
  id: pk(),
  taxType: taxType("tax_type").notNull(),
  nature: taxNature("nature").notNull(), // kewajiban / kredit
  taxPeriod: date("tax_period").notNull(), // Masa Pajak (first day of the period)
  amount: money("amount").notNull().default("0"),

  // Source document linkage (exactly one of these for auto entries; none = manual,
  // e.g. PPN Masukan from a purchase).
  installmentInvoiceId: uuid("installment_invoice_id").references(
    () => installmentInvoices.id,
    { onDelete: "set null" },
  ),
  payslipId: uuid("payslip_id").references(() => payslips.id, {
    onDelete: "set null",
  }),
  companyId: uuid("company_id").references(() => companies.id, {
    onDelete: "set null",
  }),
  employeeId: uuid("employee_id").references(() => employees.id, {
    onDelete: "set null",
  }),

  // Settlement
  dueDate: date("due_date"),
  settlementStatus: taxSettlementStatus("settlement_status")
    .notNull()
    .default("belum_disetor"),
  settledDate: date("settled_date"),
  ntpn: text("ntpn"), // No. Bukti Setor (NTPN)
  proofAttachmentUrl: text("proof_attachment_url"),

  // PPh23-specific — Bukti Potong from client (required to claim the credit).
  buktiPotongReceived: boolean("bukti_potong_received").notNull().default(false),
  buktiPotongAttachmentUrl: text("bukti_potong_attachment_url"),

  notes: text("notes"),
  ...bookkeeping,
});
