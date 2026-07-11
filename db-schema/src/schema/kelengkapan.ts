/**
 * Kelengkapan Administrasi — document-completeness checklist templates
 * (referenced as an SPH attachment, PRD Bab 4 lampiran). Not itself a PRD
 * chapter; templates are plain reusable master data with no status field —
 * per-attachment fulfillment status lives on the quotation-side snapshot
 * tables in `quotations.ts`, not here.
 */
import { integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { pk, timestamps } from "./_shared";

/** A named checklist template, e.g. "Kelengkapan Administrasi UKL-UPL/DPLH". */
export const kelengkapanTemplates = pgTable("kelengkapan_templates", {
  id: pk(),
  number: text("number"), // e.g. KLG/00001 — assigned by trigger, never reset, immutable
  numberYear: integer("number_year"),
  numberMonth: integer("number_month"),
  name: text("name").notNull(),
  ...timestamps,
});

/** Ordered persyaratan rows within a template. */
export const kelengkapanTemplateItems = pgTable("kelengkapan_template_items", {
  id: pk(),
  templateId: uuid("template_id")
    .notNull()
    .references(() => kelengkapanTemplates.id, { onDelete: "cascade" }),
  persyaratan: text("persyaratan").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});
