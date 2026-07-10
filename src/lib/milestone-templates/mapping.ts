/**
 * Pure DB-row <-> app-shape mapping for milestone templates, kept free of
 * any DB connection import so this stays unit-testable without a live
 * Postgres — see `src/lib/milestone-templates/service.ts` for the actual
 * queries.
 */
import type { milestoneTemplates, milestoneTemplateSteps } from "@/lib/db/schema";
import type { MilestoneTemplate } from "@/lib/schemas/milestone-templates";

export type MilestoneTemplateRow = typeof milestoneTemplates.$inferSelect;
export type MilestoneTemplateStepRow = typeof milestoneTemplateSteps.$inferSelect;

export function toMilestoneTemplate(
  template: MilestoneTemplateRow,
  steps: MilestoneTemplateStepRow[],
): MilestoneTemplate {
  return {
    id: template.id,
    nama: template.name,
    steps: [...steps]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((s) => ({ nama: s.name, triggersTerm: s.triggersTerm })),
  };
}
