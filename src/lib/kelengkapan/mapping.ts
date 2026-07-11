/**
 * Pure DB-row <-> app-shape mapping for Kelengkapan Administrasi, kept free
 * of any DB connection import so these functions stay unit-testable without
 * a live Postgres — see `src/lib/kelengkapan/service.ts` for the actual
 * queries.
 */
import type { kelengkapanTemplates, kelengkapanTemplateItems } from "@/lib/db/schema";
import type { KelengkapanTemplate } from "@/lib/schemas/kelengkapan";

export type KelengkapanTemplateRow = typeof kelengkapanTemplates.$inferSelect;
export type KelengkapanTemplateItemRow = typeof kelengkapanTemplateItems.$inferSelect;

function sortByOrder<T extends { sortOrder: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function toKelengkapanTemplate(
  template: KelengkapanTemplateRow,
  items: KelengkapanTemplateItemRow[],
): KelengkapanTemplate {
  return {
    id: template.id,
    number: template.number,
    nama: template.name,
    items: sortByOrder(items).map((item) => ({ persyaratan: item.persyaratan })),
  };
}
