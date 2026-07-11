/**
 * Postgres enum types.
 *
 * Only genuinely FIXED, system-meaningful sets are enums. Anything the client is
 * meant to manage themselves (statuses, categories, document types, positions,
 * etc.) is a configurable lookup TABLE instead — see config.ts. This is the core
 * "Configurable & Scalable" principle from the PRD (Bab 9).
 */
import { pgEnum } from "drizzle-orm/pg-core";

/** RBAC roles (PRD Bab 2.1). One role per user account. */
export const appRole = pgEnum("app_role", [
  "admin", // Admin / Owner — full access
  "keuangan", // Finance
  "sales", // Marketing / Sales
  "tim_teknis", // Technical team
  "viewer", // Read-only
]);

/**
 * Stable "system role" a configurable workflow status maps to, so automation
 * keeps working even when the client renames the visible label (PRD Bab 9.2).
 * NULL = an ordinary status with no automation meaning.
 */
export const statusSystemRole = pgEnum("status_system_role", [
  "SELESAI", // closes a project/milestone
  "LUNAS", // triggers a cashflow income entry
  "DIBAYAR", // triggers a cashflow expense entry
  "BATAL", // cancels related entries
]);

/** Which entity a configurable workflow status applies to (PRD Bab 9.2). */
export const workflowEntity = pgEnum("workflow_entity", [
  "penawaran", // quotation
  "proyek", // project
  "faktur", // invoice (master + installment)
  "penggajian", // payroll
  "milestone",
]);

/**
 * Document/record types that get an auto-generated number (PRD Bab 9.5).
 * SPH/INV/GAJ reset monthly (keyed by real year/month). PRY/PRS/KLG/FKI/
 * LYN/KRY are one-off record-creation events (project, company, checklist
 * template, invoice contract, service catalog item, employee) — they never
 * reset, keyed on a fixed (year=0, month=0) sentinel in
 * document_number_sequences (see assign_document_number()).
 */
export const numberedDocType = pgEnum("numbered_doc_type", [
  "SPH", "INV", "GAJ", "PRY", "PRS", "KLG", "FKI", "LYN", "KRY",
]);

/** Project assignment roles (PRD Bab 6.1). */
export const projectRole = pgEnum("project_role", [
  "ketua_tim", // team lead
  "anggota", // member
  "document_controller",
]);

/** Salary component nature (PRD Bab 3.3 / 5.2 / 9.1). */
export const salaryComponentKind = pgEnum("salary_component_kind", [
  "tunjangan", // allowance (adds to gross)
  "potongan", // deduction (reduces net)
]);

/** How a salary component value is computed. */
export const salaryCalcType = pgEnum("salary_calc_type", [
  "nominal", // fixed IDR amount
  "persentase", // percentage of base salary
  "per_hari", // per-day (e.g. overtime)
]);

/** Cashflow direction (PRD Bab 7 — Pemasukan=Kredit, Pengeluaran=Debit). */
export const cashflowType = pgEnum("cashflow_type", [
  "kredit", // income / Pemasukan
  "debit", // expense / Pengeluaran
]);

/** Where a cashflow entry originated (PRD Bab 7.2 / 7.3). */
export const cashflowSource = pgEnum("cashflow_source", [
  "manual",
  "faktur", // from a paid installment invoice
  "penggajian", // from a paid payslip
  "pajak", // from a settled tax entry
]);

/**
 * Sub-classification of an auto cashflow entry, so the 3-way invoice split and
 * payroll/tax breakdown stay reportable (PRD Bab 10.4 / 10.5).
 */
export const cashflowTaxComponent = pgEnum("cashflow_tax_component", [
  "jasa", // service income (net of tax)
  "ppn_keluaran", // output VAT held for the state
  "pph23_dipotong", // PPh23 withheld by client (reduces cash received)
  "pph21", // PPh21 remitted
  "bpjs", // BPJS remitted
  "bonus",
]);

/** The four locked, automation-driving cashflow categories (PRD Bab 9.3). */
export const cashflowCategorySystemKey = pgEnum("cashflow_category_system_key", [
  "FAKTUR",
  "PENGGAJIAN",
  "PAJAK",
  "BPJS",
  "BONUS",
]);

/**
 * Profit-and-loss treatment of a cashflow category, so the Dashboard can build the
 * accrual P&L (PRD Bab 7.2 / 8.2). NON_LABA_RUGI items (VAT deposits, PPh23 credit,
 * loan principal) are excluded from profit (BR-14).
 */
export const expenseNature = pgEnum("expense_nature", [
  "HPP", // direct project delivery cost (= Realisasi RAB)
  "OPERASIONAL", // overhead / operating expense
  "NON_LABA_RUGI", // not a P&L item — settlement / titipan / principal
]);

/** Corporate income tax (PPh Badan) method for net-profit estimate (PRD Bab 10.8). */
export const corpTaxMethod = pgEnum("corp_tax_method", [
  "final_0_5", // PP 55/2022 — 0.5% of gross revenue (omzet < 4.8B/year)
  "badan_22", // 22% of taxable profit; PPh23 credited
]);

/** RAB category for Realisasi RAB actual-cost records (PRD Bab 6.8). */
export const rabCategory = pgEnum("rab_category", [
  "personil_a", // Biaya Personil (Jumlah A)
  "langsung_b", // Biaya Langsung (Jumlah B)
]);

/** Tax types tracked in the Tax Center (PRD Bab 10.6). */
export const taxType = pgEnum("tax_type", [
  "ppn_keluaran", // output VAT (liability)
  "ppn_masukan", // input VAT (credit)
  "pph23_dipotong", // PPh23 withheld by client (tax credit)
  "pph21", // employee income tax (liability)
  "bpjs_kesehatan",
  "bpjs_ketenagakerjaan",
]);

/** Economic nature of a tax entry (PRD Bab 10.4 / 10.6). */
export const taxNature = pgEnum("tax_nature", [
  "kewajiban", // liability — must be remitted (cash out on settle)
  "kredit", // tax credit — no cash movement on settle
]);

/** Settlement status of a tax entry (PRD Bab 10.6). 🟡/🔴/🟢 */
export const taxSettlementStatus = pgEnum("tax_settlement_status", [
  "belum_disetor", // not yet settled
  "terlambat", // overdue
  "sudah_disetor", // settled
]);

/** Communication channel for templates / sending documents (PRD Bab 9.5). */
export const messageChannel = pgEnum("message_channel", ["email", "whatsapp"]);

/** Document family a message template / numbering belongs to. */
export const businessDocumentType = pgEnum("business_document_type", [
  "sph",
  "invoice",
  "slip_gaji",
]);

/** Generic audit-log action (PRD Bab 13). */
export const auditAction = pgEnum("audit_action", [
  "insert",
  "update",
  "delete", // soft delete
  "restore",
  "hard_delete",
]);

/** Delivery status of a queued email send (PRD Bab 9.5 / 11.2). WhatsApp sends go straight to "sent" — this only tracks the async email pipeline. */
export const documentDeliveryStatus = pgEnum("document_delivery_status", [
  "queued",
  "sent",
  "failed",
]);

/**
 * Per-item fulfillment status on an SPH's attached Kelengkapan checklist
 * snapshot (PRD Bab 4 lampiran). NULL on the item row = unfilled (the app's
 * "" tri-state value) — not a third enum member, see quotations.ts.
 */
export const kelengkapanItemStatus = pgEnum("kelengkapan_item_status", [
  "ada",
  "tidak",
]);

/** In-app / email notification categories (PRD Bab 13 / Dasbor Pusat Perhatian 8.5). */
export const notificationType = pgEnum("notification_type", [
  "tax_due", // H-3 tax due reminder
  "invoice_due", // invoice due / overdue
  "mention", // @mention in a project comment
  "semester_report_due", // recurring Laporan Semester reminder
  "milestone_term_ready", // milestone trigger suggests generating a termin
  "project_over_budget", // Realisasi RAB exceeds plan / margin below threshold
  "milestone_slipping", // milestone actual date past target
  "project_stalled", // no activity for N days
  "pph23_bukti_potong_missing", // PPh23 credit at risk — bukti potong not received
]);
