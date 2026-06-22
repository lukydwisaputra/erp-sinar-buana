import { z } from "zod";

/** Expense nature for P&L classification: COGS / Opex / non-P&L. */
export const sifatBeban = z.enum(["hpp", "operasional", "non_laba_rugi"]);
export type SifatBeban = z.infer<typeof sifatBeban>;

export const expenseNatureEntrySchema = z.object({
  kategori: z.string(),
  sifat: sifatBeban,
});
export type ExpenseNatureEntry = z.infer<typeof expenseNatureEntrySchema>;
