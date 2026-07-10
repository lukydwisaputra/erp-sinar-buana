/**
 * Modul Konfigurasi & Master Data Terkelola (PRD Bab 9).
 *
 * The heart of the "Configurable & Scalable" principle: every dropdown list,
 * workflow status, tariff and template is data the client edits themselves — no
 * developer required. Each lookup supports CRUD + active/inactive + ordering.
 */
import {
  boolean,
  integer,
  pgTable,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import {
  businessDocumentType,
  cashflowCategorySystemKey,
  expenseNature,
  messageChannel,
  salaryCalcType,
  salaryComponentKind,
  statusSystemRole,
  workflowEntity,
} from "./enums";
import { money, rate, pk, timestamps } from "./_shared";

/** Columns shared by every simple managed dropdown list. */
const lookup = {
  id: pk(),
  label: text("label").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
};

// ── 9.1 Daftar Pilihan (master data) ──────────────────────────────────────────

/** Jenis Dokumen — e.g. Rintek B3, Standar Teknis, SPPL, RKL-RPL Rinci, SLO. */
export const documentTypes = pgTable("document_types", { ...lookup });

/** Kewenangan — Provinsi / Kota-Kabupaten / Kawasan Industri. */
export const authorities = pgTable("authorities", { ...lookup });

/** Dasar Hukum — e.g. "Permenlhk No.5 Tahun 2021". */
export const legalBases = pgTable("legal_bases", { ...lookup });

/** Area Administrasi / Kawasan Industri — e.g. KIIC, KITC, Dwipapuri Abadi. */
export const adminAreas = pgTable("admin_areas", { ...lookup });

/** Jabatan / Posisi — e.g. Staff Teknik, Ketua Tim. */
export const positions = pgTable("positions", { ...lookup });

/**
 * Status Kepegawaian (+ pengali). e.g. Probation (×0.8), Tetap (×1.0), Kontrak.
 * `multiplier` is applied to base salary when building a payslip (PRD Bab 5.2).
 */
export const employmentStatuses = pgTable("employment_statuses", {
  ...lookup,
  multiplier: rate("multiplier").notNull().default("1"),
});

/**
 * Komponen Gaji — tunjangan/potongan with a calculation method (PRD Bab 9.1).
 * `isEmployerPortion` marks BPJS employer-side contributions (cash out only on
 * remittance, not part of take-home — PRD Bab 10.5).
 */
export const salaryComponents = pgTable("salary_components", {
  ...lookup,
  kind: salaryComponentKind("kind").notNull(),
  calcType: salaryCalcType("calc_type").notNull().default("nominal"),
  defaultValue: money("default_value").notNull().default("0"),
  isEmployerPortion: boolean("is_employer_portion").notNull().default(false),
});

/**
 * Rekening Bank milik perusahaan (PRD Bab 3.4 / 5.1.D). Selectable per invoice.
 * e.g. BNI a.n. SINAR BUANA MANDIRI JAYA — 0559332815.
 */
export const bankAccounts = pgTable("bank_accounts", {
  ...lookup, // `label` = display name, e.g. "BNI - Operasional"
  bankName: text("bank_name").notNull(),
  accountHolder: text("account_holder").notNull(),
  accountNumber: text("account_number").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
});

// ── 9.3 Kategori Arus Kas ─────────────────────────────────────────────────────

/**
 * Cashflow categories. Four are locked system categories driving automation
 * (FAKTUR, PENGGAJIAN, PAJAK, BONUS — plus BPJS); custom categories unlimited.
 * `systemKey` non-null => locked (cannot be renamed-away or deleted).
 * `expenseNature` drives the Dashboard accrual P&L (PRD Bab 7.2 / 8.2): HPP /
 * OPERASIONAL / NON_LABA_RUGI (the last is excluded from profit — BR-14).
 */
export const cashflowCategories = pgTable("cashflow_categories", {
  ...lookup,
  systemKey: cashflowCategorySystemKey("system_key"),
  expenseNature: expenseNature("expense_nature")
    .notNull()
    .default("OPERASIONAL"),
  isSystem: boolean("is_system").notNull().default(false),
});

// ── 9.2 Workflow Status (konfigurabel) ────────────────────────────────────────

/**
 * Configurable statuses for Penawaran / Proyek / Faktur / Penggajian / Milestone.
 * The client renames labels / adds statuses / reorders freely; automation keys
 * off `systemRole` (SELESAI/LUNAS/DIBAYAR/BATAL), not the label (PRD Bab 9.2).
 */
export const workflowStatuses = pgTable(
  "workflow_statuses",
  {
    ...lookup,
    entity: workflowEntity("entity").notNull(),
    systemRole: statusSystemRole("system_role"),
    color: text("color"), // optional UI hint, e.g. "#facc15"
    isDefault: boolean("is_default").notNull().default(false),
    // Protects rows automation/default-assignment depends on from Konfigurasi
    // delete — mirrors cashflow_categories.isSystem. Not client-settable.
    isSystem: boolean("is_system").notNull().default(false),
  },
  (t) => ({
    uqEntityLabel: unique("workflow_statuses_entity_label_uq").on(
      t.entity,
      t.label,
    ),
  }),
);

// ── 9.5 Template pesan pengiriman dokumen ─────────────────────────────────────

/**
 * Email/WhatsApp message templates per document type (PRD Bab 9.5).
 * `subject` is used for email only.
 */
export const messageTemplates = pgTable(
  "message_templates",
  {
    id: pk(),
    channel: messageChannel("channel").notNull(),
    documentType: businessDocumentType("document_type").notNull(),
    subject: text("subject"),
    body: text("body").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => ({
    uqChannelDoc: unique("message_templates_channel_doc_uq").on(
      t.channel,
      t.documentType,
    ),
  }),
);

// ── 9.4 Template (Termin & PDF) ────────────────────────────────────────────
// Milestone templates live in master-data.ts (milestone_templates /
// milestone_template_steps) — already real, FK'd from service_catalog.

/** Skema termin (payment-schedule) templates, reusable across SPHs. Field
 * names mirror `quotation_term_scheme` (the real per-SPH table) for
 * consistency: label/percentage/milestoneTriggerLabel/sortOrder. */
export const terminTemplates = pgTable("termin_templates", {
  id: pk(),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

export const terminTemplateSteps = pgTable("termin_template_steps", {
  id: pk(),
  templateId: uuid("template_id")
    .notNull()
    .references(() => terminTemplates.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  percentage: rate("percentage").notNull(),
  milestoneTriggerLabel: text("milestone_trigger_label"),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** PDF header/footer note templates per document type. Not wired into
 * actual document rendering (sph-cover-letter.tsx etc. stay hardcoded) —
 * CRUD only, same boundary the mock had. */
export const pdfTemplates = pgTable("pdf_templates", {
  id: pk(),
  name: text("name").notNull(),
  documentType: businessDocumentType("document_type").notNull(),
  headerNote: text("header_note").notNull().default(""),
  footerNote: text("footer_note").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});
