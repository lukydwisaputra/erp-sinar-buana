/**
 * Pure DB-row <-> app-shape mapping for a project's Estimasi RAB — a
 * one-time copy of the SPH's RAB (project_rab_estimates/project_rab_items),
 * kept free of any DB connection import so this stays unit-testable without
 * a live Postgres — see `src/lib/proyek/rab-service.ts` for the actual
 * queries.
 */
import type { projectRabEstimates, projectRabItems } from "@/lib/db/schema";
import type { ProyekRab } from "@/lib/schemas/proyek";

export type ProjectRabEstimateRow = typeof projectRabEstimates.$inferSelect;
export type ProjectRabItemRow = typeof projectRabItems.$inferSelect;

function sortByOrder<T extends { sortOrder: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function toProyekRab(
  estimate: ProjectRabEstimateRow,
  layananNama: string | null,
  items: ProjectRabItemRow[],
): ProyekRab {
  const sorted = sortByOrder(items);
  const toItem = (r: ProjectRabItemRow) => ({
    uraian: r.uraian,
    vol: Number(r.volume),
    satuan: r.unit ?? "",
    hargaSatuan: Number(r.unitPrice),
  });
  return {
    estimateId: estimate.id,
    layananNama,
    personil: sorted.filter((r) => r.section === "personil").map(toItem),
    langsung: sorted.filter((r) => r.section === "langsung").map(toItem),
  };
}
