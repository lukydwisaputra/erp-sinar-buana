/**
 * Profitabilitas — Realisasi RAB (PRD Bab 6.8 / 8.3).
 *
 * RAB on the SPH (quotations.ts) is the *planned* cost. Actual project cost is
 * recorded here per project, against the RAB categories (Personil A / Langsung B),
 * by Finance — manually, no per-transaction tagging required. This is the single
 * source of HPP / project COGS for Margin Aktual and the Dashboard accrual P&L
 * (BR-15). An entry may optionally link to the cashflow expense it reflects.
 */
import { date, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { money, bookkeeping, pk } from "./_shared";
import { rabCategory } from "./enums";
import { projects } from "./projects";
import { cashflowEntries } from "./cashflow";

export const rabActuals = pgTable("rab_actuals", {
  id: pk(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  rabCategory: rabCategory("rab_category").notNull(), // personil_a / langsung_b
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
