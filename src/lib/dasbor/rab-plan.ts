import type { Sph } from "@/lib/schemas/penawaran";
import type { RabPlan } from "@/lib/dasbor/types";

const rowsTotal = (rows: { vol: number; hargaSatuan: number }[]): number =>
  rows.reduce((s, r) => s + r.vol * r.hargaSatuan, 0);

/**
 * Aggregate the planned RAB cost from an SPH: Personil (A) and Langsung (B)
 * summed across every service item. total = personil + langsung.
 */
export function sumRabPlan(sph: Pick<Sph, "items">): RabPlan {
  let personil = 0;
  let langsung = 0;
  for (const item of sph.items) {
    personil += rowsTotal(item.rab.personil);
    langsung += rowsTotal(item.rab.langsung);
  }
  return { personil, langsung, total: personil + langsung };
}
