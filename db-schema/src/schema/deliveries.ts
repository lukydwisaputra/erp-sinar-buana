/**
 * Document delivery log (PRD Bab 9.5 / 11.2) — one row per SPH/Invoice/Slip
 * Gaji actually sent to a recipient, by email or WhatsApp.
 *
 * Same "explicit nullable owner FKs, not a polymorphic type+id pair" shape as
 * attachments.ts — exactly one of quotationId/installmentInvoiceId/payslipId is
 * expected per row, enforced here by a real Postgres CHECK (num_nonnulls = 1).
 */
import { check, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { pk, timestamps } from "./_shared";
import { messageChannel, businessDocumentType, documentDeliveryStatus } from "./enums";
import { quotations } from "./quotations";
import { installmentInvoices } from "./billing";
import { payslips } from "./payroll";
import { userProfiles } from "./auth";

export const documentDeliveries = pgTable(
  "document_deliveries",
  {
    id: pk(),
    channel: messageChannel("channel").notNull(),
    documentType: businessDocumentType("document_type").notNull(),

    // Owner — exactly one of the following (see CHECK below).
    quotationId: uuid("quotation_id").references(() => quotations.id, {
      onDelete: "cascade",
    }),
    installmentInvoiceId: uuid("installment_invoice_id").references(
      () => installmentInvoices.id,
      { onDelete: "cascade" },
    ),
    payslipId: uuid("payslip_id").references(() => payslips.id, {
      onDelete: "cascade",
    }),

    documentNumber: text("document_number").notNull(), // denormalized nomor at send time
    recipientName: text("recipient_name").notNull(),
    recipientContact: text("recipient_contact").notNull(), // phone (whatsapp) or email

    status: documentDeliveryStatus("status").notNull().default("queued"),
    error: text("error"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => userProfiles.id, {
      onDelete: "set null",
    }),

    ...timestamps,
  },
  (t) => ({
    exactlyOneOwnerChk: check(
      "document_deliveries_exactly_one_owner_chk",
      sql`num_nonnulls(${t.quotationId}, ${t.installmentInvoiceId}, ${t.payslipId}) = 1`,
    ),
  }),
);
