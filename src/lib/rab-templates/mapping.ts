/**
 * Pure DB-row <-> app-shape mapping for RAB templates, kept free of any DB
 * connection import so this stays unit-testable without a live Postgres —
 * see `src/lib/rab-templates/service.ts` for the actual queries.
 */
import type { rabTemplates, rabTemplateRows } from "@/lib/db/schema";
import type { RabTemplate } from "@/lib/schemas/rab-templates";

export type RabTemplateRow = typeof rabTemplates.$inferSelect;
export type RabTemplateLineRow = typeof rabTemplateRows.$inferSelect;

export function toRabTemplate(
  template: RabTemplateRow,
  rows: RabTemplateLineRow[],
): RabTemplate {
  const sorted = [...rows].sort((a, b) => a.sortOrder - b.sortOrder);
  const toItem = (r: RabTemplateLineRow) => ({
    uraian: r.uraian,
    vol: Number(r.volume),
    satuan: r.unit ?? "",
    hargaSatuan: Number(r.unitPrice),
  });
  return {
    id: template.id,
    nama: template.name,
    personil: sorted.filter((r) => r.section === "personil").map(toItem),
    langsung: sorted.filter((r) => r.section === "langsung").map(toItem),
  };
}
