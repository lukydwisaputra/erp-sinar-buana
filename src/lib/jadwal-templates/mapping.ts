/**
 * Pure DB-row <-> app-shape mapping for Jadwal (Estimasi Jadwal) templates,
 * kept free of any DB connection import so this stays unit-testable without
 * a live Postgres — see `src/lib/jadwal-templates/service.ts` for the actual
 * queries.
 */
import type {
  jadwalTemplates, jadwalTemplateRows, jadwalTemplateMarkedWeeks,
} from "@/lib/db/schema";
import type { JadwalTemplate } from "@/lib/schemas/jadwal-templates";

export type JadwalTemplateRow = typeof jadwalTemplates.$inferSelect;
export type JadwalTemplateLineRow = typeof jadwalTemplateRows.$inferSelect;
export type JadwalTemplateMarkedWeekRow = typeof jadwalTemplateMarkedWeeks.$inferSelect;

export function toJadwalTemplate(
  template: JadwalTemplateRow,
  rows: JadwalTemplateLineRow[],
  markedWeeks: Pick<JadwalTemplateMarkedWeekRow, "rowId" | "weekNumber">[],
): JadwalTemplate {
  const sortedRows = [...rows].sort((a, b) => a.sortOrder - b.sortOrder);
  const weeksByRowId = new Map<string, number[]>();
  for (const mw of markedWeeks) {
    const list = weeksByRowId.get(mw.rowId) ?? [];
    list.push(mw.weekNumber);
    weeksByRowId.set(mw.rowId, list);
  }
  return {
    id: template.id,
    nama: template.name,
    bulan: template.numMonths,
    kegiatan: sortedRows.map((r) => r.activityName),
    highlights: sortedRows.map((r) => (weeksByRowId.get(r.id) ?? []).sort((a, b) => a - b)),
  };
}
