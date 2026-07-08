import type { Proyek } from "@/lib/schemas/proyek";

export type CountRow = { label: string; count: number };

export type ProyekSummary = {
  total: number;
  byStatus: CountRow[];
  byArea: CountRow[];
  byLayanan: CountRow[];
};

function countBy<T>(items: T[], keyOf: (item: T) => string | null): CountRow[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = keyOf(item);
    if (key === null) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([label, count]) => ({ label, count }));
}

/** FR-09.4 — Ringkasan Proyek: count by status/area/service type. Rendered
 * for all roles (unlike the finance-only panels) — `proyeks` should already
 * be narrowed via rbac-view.ts's filterProyekForRole for non-finance callers. */
export function computeProyekSummary(proyeks: Proyek[]): ProyekSummary {
  return {
    total: proyeks.length,
    byStatus: countBy(proyeks, (p) => p.status),
    byArea: countBy(proyeks, (p) => p.area || null),
    byLayanan: countBy(proyeks.flatMap((p) => p.layanan), (l) => l.nama),
  };
}
