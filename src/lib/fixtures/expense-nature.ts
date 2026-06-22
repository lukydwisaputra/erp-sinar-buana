import type { ExpenseNatureEntry, SifatBeban } from "@/lib/schemas/expense-nature";

/** Fallback when a category has no explicit mapping. */
export const DEFAULT_SIFAT: SifatBeban = "operasional";

/**
 * Defaults for known cashflow categories.
 * - faktur: income (mapped non_laba_rugi defensively — never a cost)
 * - penggajian: overhead opex (project cost comes from Realisasi RAB, not here)
 * - pajak: PPN titipan + PPh 23 credit -> non_laba_rugi (BR-14)
 * - bonus: opex
 * - manual examples seen in fixtures kept aligned with their intent
 */
export const expenseNatureFixtures: ExpenseNatureEntry[] = [
  { kategori: "faktur", sifat: "non_laba_rugi" },
  { kategori: "penggajian", sifat: "operasional" },
  { kategori: "pajak", sifat: "non_laba_rugi" },
  { kategori: "bonus", sifat: "operasional" },
  { kategori: "Operasional", sifat: "operasional" },
  { kategori: "Sewa Kantor", sifat: "operasional" },
  { kategori: "Biaya Proyek", sifat: "hpp" },
];
