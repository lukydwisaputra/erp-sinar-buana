import type { TaxEntry } from "@/lib/schemas/tax-entries";

export type TaxSummary = {
  belumDisetor: number;
  jatuhTempoTerdekat: string | null;
  terlambatCount: number;
  pph23KreditTerkumpul: number;
};

/** FR-09.5 — Ringkasan Pajak. Replaces page.tsx's inline taxDue useMemo. */
export function computeTaxSummary(kewajiban: TaxEntry[], today: string): TaxSummary {
  const outstanding = kewajiban.filter((k) => k.settlementStatus !== "sudah_disetor");
  const belumDisetor = outstanding.reduce((s, k) => s + k.jumlah, 0);
  const terlambatCount = outstanding.filter((k) => k.dueDate !== null && k.dueDate < today).length;
  const upcoming = outstanding
    .map((k) => k.dueDate)
    .filter((d): d is string => d !== null)
    .sort();
  const jatuhTempoTerdekat = upcoming.length > 0 ? upcoming[0] : null;
  const pph23KreditTerkumpul = kewajiban
    .filter((k) => k.taxType === "pph23_dipotong" && k.nature === "kredit")
    .reduce((s, k) => s + k.jumlah, 0);

  return { belumDisetor, jatuhTempoTerdekat, terlambatCount, pph23KreditTerkumpul };
}
