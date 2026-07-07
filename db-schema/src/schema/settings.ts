/**
 * Profil Perusahaan & Pengaturan (PRD Bab 3.4, 9.5) + document numbering (9.5).
 *
 * `companyProfile`, `taxSettings` and `numberingSettings` are SINGLETON tables —
 * exactly one row, guarded by a CHECK on a fixed boolean PK-ish `singleton`
 * column. This keeps "the settings" addressable without a magic id.
 */
import {
  boolean,
  integer,
  pgTable,
  smallint,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { corpTaxMethod, numberedDocType } from "./enums";
import { money, rate, timestamps } from "./_shared";
import { bankAccounts } from "./config";
import { employees } from "./master-data";

/** A boolean column locked to TRUE so the table can hold at most one row. */
const singletonGuard = boolean("singleton")
  .notNull()
  .default(true)
  .primaryKey();

/**
 * Profil Perusahaan — header/footer identity + PKP status (drives whether PPN is
 * collected at all — PRD Bab 10.6 "Prasyarat — Status PKP").
 */
export const companyProfile = pgTable("company_profile", {
  singleton: singletonGuard,
  logoUrl: text("logo_url"),
  legalName: text("legal_name").notNull(),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  npwp: text("npwp"),
  isPkp: boolean("is_pkp").notNull().default(true),
  defaultSignerEmployeeId: uuid("default_signer_employee_id").references(
    () => employees.id,
    { onDelete: "set null" },
  ),
  ...timestamps,
});

/**
 * Tarif & jatuh tempo pajak (PRD Bab 9.5 / 10). All rates configurable; defaults
 * seeded (PPN 12% via DPP 11/12, PPh23 2%). Due-days are day-of-next-month.
 */
export const taxSettings = pgTable("tax_settings", {
  singleton: singletonGuard,
  ppnRate: rate("ppn_rate").notNull().default("12"), // % applied to DPP
  ppnDppNumerator: integer("ppn_dpp_numerator").notNull().default(11),
  ppnDppDenominator: integer("ppn_dpp_denominator").notNull().default(12),
  pph23Rate: rate("pph23_rate").notNull().default("2"), // % of value, withheld
  // Default settlement / reporting due days (day of the following month).
  pph21SetorDay: smallint("pph21_setor_day").notNull().default(10),
  pph21LaporDay: smallint("pph21_lapor_day").notNull().default(20),
  pph23SetorDay: smallint("pph23_setor_day").notNull().default(10),
  pph23LaporDay: smallint("pph23_lapor_day").notNull().default(20),
  ppnSetorDay: smallint("ppn_setor_day").notNull().default(31), // end of next month
  bpjsSetorDay: smallint("bpjs_setor_day").notNull().default(10),
  // Invoice receivable due (Tanggal + N hari) — PRD Bab 5.1.B.
  invoiceDueDays: integer("invoice_due_days").notNull().default(14),
  // Quotation validity (masa berlaku) in calendar days — PRD Bab 4.2.
  quotationValidityDays: integer("quotation_validity_days").notNull().default(30),
  // Corporate income tax (PPh Badan) — drives Dashboard net-profit estimate
  // (PRD Bab 10.8). final_0_5 = 0.5% of revenue; badan_22 = 22% of profit.
  corpTaxMethod: corpTaxMethod("corp_tax_method").notNull().default("final_0_5"),
  corpTaxRate: rate("corp_tax_rate").notNull().default("0.5"), // % per method
  umkmThreshold: money("umkm_threshold").notNull().default("4800000000"), // Rp 4.8B/year
  ...timestamps,
});

/**
 * Dashboard / profitability parameters (PRD Bab 9.5 / 8). Singleton.
 * `projectMarginThreshold` = fraction of plan margin below which a project is 🟡
 * (e.g. 0.8 = 80%). Forecast horizon & stalled-days feed the Pusat Perhatian.
 */
export const dashboardSettings = pgTable("dashboard_settings", {
  singleton: singletonGuard,
  projectMarginThreshold: rate("project_margin_threshold")
    .notNull()
    .default("0.8"),
  forecastHorizonDays: integer("forecast_horizon_days").notNull().default(90),
  stalledProjectDays: integer("stalled_project_days").notNull().default(30),
  ...timestamps,
});

/**
 * Numbering formats (PRD Bab 9.5), e.g. SPH/{seq}/{month}.{year} and
 * INV/{seq}/{month}.{year}. Tokens are substituted by the numbering trigger.
 */
export const numberingSettings = pgTable("numbering_settings", {
  singleton: singletonGuard,
  sphFormat: text("sph_format").notNull().default("SPH/{seq}/{month}.{year}"),
  invFormat: text("inv_format").notNull().default("INV/{seq}/{month}.{year}"),
  gajFormat: text("gaj_format").notNull().default("GAJ/{seq}/{month}.{year}"),
  seqPadding: smallint("seq_padding").notNull().default(3), // 001
  ...timestamps,
});

/**
 * Per-(docType, year, month) running counter (PRD Bab 9.5).
 * Counters are SEPARATE per doc type and RESET each month. Numbers are assigned
 * once at creation and never change on edit — enforced by the numbering trigger
 * (sql/triggers/10-numbering.sql).
 */
export const documentNumberSequences = pgTable(
  "document_number_sequences",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    docType: numberedDocType("doc_type").notNull(),
    year: smallint("year").notNull(),
    month: smallint("month").notNull(),
    lastNumber: integer("last_number").notNull().default(0),
    ...timestamps,
  },
  (t) => ({
    uqSeq: unique("document_number_sequences_uq").on(
      t.docType,
      t.year,
      t.month,
    ),
  }),
);
