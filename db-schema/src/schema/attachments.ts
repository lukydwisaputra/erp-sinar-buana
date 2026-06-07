/**
 * Attachments (files in Supabase Storage, referenced by URL/path).
 *
 * A single table with explicit nullable owner FKs (rather than a polymorphic
 * type+id pair) so referential integrity is preserved. Exactly one owner FK is
 * expected per row; a CHECK enforces this (sql/triggers / constraints). Used by
 * project comments, tax entries, installment invoices and payslips.
 */
import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { pk, timestamps } from "./_shared";
import { userProfiles } from "./auth";
import { projectComments } from "./projects";
import { taxEntries } from "./tax";
import { installmentInvoices } from "./billing";
import { payslips } from "./payroll";

export const attachments = pgTable("attachments", {
  id: pk(),
  fileUrl: text("file_url").notNull(), // Supabase Storage path / public URL
  fileName: text("file_name"),
  contentType: text("content_type"),
  uploadedBy: uuid("uploaded_by").references(() => userProfiles.id, {
    onDelete: "set null",
  }),

  // Owner — exactly one of the following.
  commentId: uuid("comment_id").references(() => projectComments.id, {
    onDelete: "cascade",
  }),
  taxEntryId: uuid("tax_entry_id").references(() => taxEntries.id, {
    onDelete: "cascade",
  }),
  installmentInvoiceId: uuid("installment_invoice_id").references(
    () => installmentInvoices.id,
    { onDelete: "cascade" },
  ),
  payslipId: uuid("payslip_id").references(() => payslips.id, {
    onDelete: "cascade",
  }),

  ...timestamps,
});
