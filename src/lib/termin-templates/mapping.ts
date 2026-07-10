/**
 * Pure DB-row <-> app-shape mapping for termin templates, kept free of any
 * DB connection import so this stays unit-testable without a live Postgres
 * — see `src/lib/termin-templates/service.ts` for the actual queries.
 */
import type { terminTemplates, terminTemplateSteps } from "@/lib/db/schema";
import type { TerminTemplate } from "@/lib/schemas/termin-templates";

export type TerminTemplateRow = typeof terminTemplates.$inferSelect;
export type TerminTemplateStepRow = typeof terminTemplateSteps.$inferSelect;

export function toTerminTemplate(
  template: TerminTemplateRow,
  steps: TerminTemplateStepRow[],
): TerminTemplate {
  return {
    id: template.id,
    nama: template.name,
    steps: [...steps]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((s) => ({
        label: s.label,
        persen: Number(s.percentage),
        pemicu: s.milestoneTriggerLabel ?? "",
      })),
  };
}
