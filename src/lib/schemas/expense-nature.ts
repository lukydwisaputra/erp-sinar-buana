import { z } from "zod";

/** Expense nature for P&L classification: COGS / Opex / non-P&L. */
export const sifatBeban = z.enum(["hpp", "operasional", "non_laba_rugi"]);
export type SifatBeban = z.infer<typeof sifatBeban>;

/** Fallback when a category has no explicit mapping. */
export const DEFAULT_SIFAT: SifatBeban = "operasional";

/** A real cashflow_categories row, keyed by id (not label) — `locked`
 * mirrors the DB's `is_system` boolean instead of the mock's label-matched
 * LOCKED_KATEGORI set. */
export const cashflowCategoryRowSchema = z.object({
  id: z.string(),
  kategori: z.string(),
  sifat: sifatBeban,
  locked: z.boolean(),
});
export type CashflowCategoryRow = z.infer<typeof cashflowCategoryRowSchema>;

export const createCashflowCategoryInputSchema = z.object({
  kategori: z.string().min(1, "Nama kategori wajib diisi."),
  sifat: z.enum(["operasional", "non_laba_rugi"]),
});
export type CreateCashflowCategoryInput = z.infer<typeof createCashflowCategoryInputSchema>;

export const updateCashflowCategoryInputSchema = z.object({
  sifat: sifatBeban,
});
export type UpdateCashflowCategoryInput = z.infer<typeof updateCashflowCategoryInputSchema>;
