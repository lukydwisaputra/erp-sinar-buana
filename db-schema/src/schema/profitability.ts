/**
 * Profitabilitas — Realisasi RAB (PRD Bab 6.8 / 8.3).
 *
 * RAB on the SPH (quotations.ts) is the *planned* cost. Actual project cost is
 * recorded here per project, against the RAB categories (Personil A / Langsung B),
 * by Finance — manually, no per-transaction tagging required. This is the single
 * source of HPP / project COGS for Margin Aktual and the Dashboard accrual P&L
 * (BR-15). An entry may optionally link to the cashflow expense it reflects.
 */
import { date, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { money, rate, bookkeeping, timestamps, pk } from "./_shared";
import { rabCategory } from "./enums";
import { projects } from "./projects";
import { quotationItems } from "./quotations";
import { cashflowEntries } from "./cashflow";

export const rabActuals = pgTable("rab_actuals", {
  id: pk(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  rabCategory: rabCategory("rab_category").notNull(), // personil_a / langsung_b
  // Which RAB line this actual cost belongs to (e.g. "Tenaga Ahli") — distinct
  // from `note`, which is a free-text remark on the entry itself.
  rabLineLabel: text("rab_line_label"),
  amount: money("amount").notNull().default("0"),
  date: date("date").notNull(),
  note: text("note"),
  // Optional link to the cashflow expense this realisasi reflects.
  cashflowEntryId: uuid("cashflow_entry_id").references(
    () => cashflowEntries.id,
    { onDelete: "set null" },
  ),
  ...bookkeeping,
});

/**
 * Estimasi RAB — one per project service/item, seeded as a ONE-TIME COPY of
 * that item's `quotation_rab_personnel`/`quotation_rab_direct_costs` rows at
 * project-creation time (mirrors `activity_schedules`' parent/child shape,
 * not the SPH's live tables — editing this never touches the source SPH).
 * Admin/Keuangan only (same visibility rule as `rab_actuals` above).
 */
export const projectRabEstimates = pgTable("project_rab_estimates", {
  id: pk(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  // Traceability only, e.g. resolving the service name for the section
  // header — never read back to reconstruct rows (this is a snapshot).
  quotationItemId: uuid("quotation_item_id").references(() => quotationItems.id, {
    onDelete: "set null",
  }),
  ...timestamps,
});

export const projectRabItems = pgTable("project_rab_items", {
  id: pk(),
  estimateId: uuid("estimate_id")
    .notNull()
    .references(() => projectRabEstimates.id, { onDelete: "cascade" }),
  section: text("section").notNull(), // "personil" | "langsung"
  uraian: text("uraian").notNull(),
  volume: rate("volume").notNull().default("1"),
  unit: text("unit"),
  unitPrice: money("unit_price").notNull().default("0"),
  sortOrder: integer("sort_order").notNull().default(0),
});
