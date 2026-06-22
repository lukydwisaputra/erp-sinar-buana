import { delay } from "@/lib/data/_delay";
import { expenseNatureFixtures, DEFAULT_SIFAT } from "@/lib/fixtures/expense-nature";
import {
  expenseNatureEntrySchema,
  type ExpenseNatureEntry,
  type SifatBeban,
} from "@/lib/schemas/expense-nature";

export async function listExpenseNature(): Promise<ExpenseNatureEntry[]> {
  await delay();
  return expenseNatureEntrySchema.array().parse(expenseNatureFixtures);
}

export async function getSifatBeban(kategori: string): Promise<SifatBeban> {
  await delay();
  const found = expenseNatureFixtures.find((e) => e.kategori === kategori);
  return found ? found.sifat : DEFAULT_SIFAT;
}

export async function setSifatBeban(kategori: string, sifat: SifatBeban): Promise<ExpenseNatureEntry> {
  await delay(300);
  const existing = expenseNatureFixtures.find((e) => e.kategori === kategori);
  if (existing) {
    existing.sifat = sifat;
    return expenseNatureEntrySchema.parse(existing);
  }
  const entry = expenseNatureEntrySchema.parse({ kategori, sifat });
  expenseNatureFixtures.push(entry);
  return entry;
}
