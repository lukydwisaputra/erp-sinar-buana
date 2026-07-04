/**
 * Modul Penawaran / Quotation / SPH (PRD Bab 4).
 *
 * Flow: Draft → Leads-Terkirim → Convert-Deal. On Deal the quotation seeds a
 * Project (services + activity schedule → milestones/Gantt + contract value) and
 * a Master Invoice (services + total + proposed term scheme). Status is a
 * configurable workflow_status (entity = 'penawaran').
 */
import { boolean, date, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { money, rate, bookkeeping, pk } from "./_shared";
import { companies, companyContacts, serviceCatalog } from "./master-data";
import { workflowStatuses } from "./config";

/** SPH header (PRD Bab 4.1 / 4.2). `number` is assigned by the numbering trigger. */
export const quotations = pgTable("quotations", {
  id: pk(),
  number: text("number"), // e.g. SPH/001/5.2026 — set on create, immutable on edit
  numberYear: integer("number_year"),
  numberMonth: integer("number_month"),
  date: date("date").notNull(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "restrict" }),
  contactId: uuid("contact_id").references(() => companyContacts.id, {
    onDelete: "set null",
  }),
  statusId: uuid("status_id").references(() => workflowStatuses.id, {
    onDelete: "set null",
  }),
  subject: text("subject"), // perihal
  validityDays: integer("validity_days"), // masa berlaku (default from settings)
  notes: text("notes"), // catatan / ketentuan
  totalAmount: money("total_amount").notNull().default("0"), // Total Penawaran
  // Cover-letter content (PRD Bab 4.1) — each SPH can override these per-document.
  openingSentence: text("opening_sentence"), // kalimat pembuka
  attachmentNote: text("attachment_note"), // lampiran
  recipientTitle: text("recipient_title"), // jabatan penerima, e.g. "Direktur"
  rincianActive: boolean("rincian_active").notNull().default(true), // include RAB/Jadwal appendix
  // Tax toggles — per-SPH override of company defaults (PRD Bab 4.1 / 10).
  ppnActive: boolean("ppn_active").notNull().default(false),
  ppnPercent: rate("ppn_percent"),
  pph23Active: boolean("pph23_active").notNull().default(false),
  pph23Percent: rate("pph23_percent"),
  // Optional PIC override (defaults to the company's registered contact).
  picOverrideActive: boolean("pic_override_active").notNull().default(false),
  picOverrideName: text("pic_override_name"),
  picOverridePosition: text("pic_override_position"),
  ...bookkeeping,
});

/** SPH line items, linked to the service catalog (PRD Bab 4.2). */
export const quotationItems = pgTable("quotation_items", {
  id: pk(),
  quotationId: uuid("quotation_id")
    .notNull()
    .references(() => quotations.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").references(() => serviceCatalog.id, {
    onDelete: "set null",
  }),
  description: text("description").notNull(), // Uraian (snapshot, editable)
  unitPrice: money("unit_price").notNull().default("0"),
  quantity: rate("quantity").notNull().default("1"), // Vol/Paket
  unit: text("unit"), // Satuan, e.g. "Paket"
  lineTotal: money("line_total").notNull().default("0"),
  sortOrder: integer("sort_order").notNull().default(0),
});

/**
 * Proposed installment scheme on the SPH (PRD Bab 4.2). This is a SUGGESTION used
 * later to configure the Master Invoice's real terms; `milestoneTriggerLabel`
 * describes the trigger ("saat Rincian Teknis selesai") before milestones exist.
 */
export const quotationTermScheme = pgTable("quotation_term_scheme", {
  id: pk(),
  quotationId: uuid("quotation_id")
    .notNull()
    .references(() => quotations.id, { onDelete: "cascade" }),
  label: text("label").notNull(), // e.g. "Termin I"
  percentage: rate("percentage").notNull(), // e.g. 40.0000
  milestoneTriggerLabel: text("milestone_trigger_label"),
  sortOrder: integer("sort_order").notNull().default(0),
});

/**
 * RAB Internal — Biaya Personil (Jumlah A). Internal only; not shown to client.
 * Estimasi Margin = Total Penawaran − (A + B). (PRD Bab 4.3)
 */
export const quotationRabPersonnel = pgTable("quotation_rab_personnel", {
  id: pk(),
  quotationId: uuid("quotation_id")
    .notNull()
    .references(() => quotations.id, { onDelete: "cascade" }),
  // Which SPH line item this RAB row belongs to (each service item carries its
  // own personnel budget in the app — PRD Bab 4.3/4.4). Nullable so a row can
  // still exist without an item during transition/import.
  quotationItemId: uuid("quotation_item_id").references(() => quotationItems.id, {
    onDelete: "cascade",
  }),
  role: text("role").notNull(), // Ketua Tim / Anggota / Document Controller
  volumeMonths: rate("volume_months").notNull().default("1"),
  unitPrice: money("unit_price").notNull().default("0"),
  amount: money("amount").notNull().default("0"),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** RAB Internal — Biaya Langsung (Jumlah B). (PRD Bab 4.3) */
export const quotationRabDirectCosts = pgTable("quotation_rab_direct_costs", {
  id: pk(),
  quotationId: uuid("quotation_id")
    .notNull()
    .references(() => quotations.id, { onDelete: "cascade" }),
  // Same per-item attribution as quotationRabPersonnel above.
  quotationItemId: uuid("quotation_item_id").references(() => quotationItems.id, {
    onDelete: "cascade",
  }),
  description: text("description").notNull(), // survey, cetak, transportasi, ...
  amount: money("amount").notNull().default("0"),
  sortOrder: integer("sort_order").notNull().default(0),
});
