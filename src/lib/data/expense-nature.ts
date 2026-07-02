import { delay } from "@/lib/data/_delay";
import { expenseNatureFixtures, DEFAULT_SIFAT } from "@/lib/fixtures/expense-nature";
import {
  expenseNatureEntrySchema,
  type ExpenseNatureEntry,
  type SifatBeban,
} from "@/lib/schemas/expense-nature";
import { arusKasKategori } from "@/lib/schemas/arus-kas";

/** The 4 cashflow categories driven by automation — cannot be renamed or deleted. */
export const LOCKED_KATEGORI = new Set<string>(arusKasKategori.options);

export type ExpenseNatureRow = ExpenseNatureEntry & { locked: boolean };

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

export async function listExpenseNatureRows(): Promise<ExpenseNatureRow[]> {
  const rows = await listExpenseNature();
  return rows.map((r) => ({ ...r, locked: LOCKED_KATEGORI.has(r.kategori) }));
}

/**
 * Create a custom Arus Kas category. Unlike the general-purpose setSifatBeban
 * (which any future caller may use for any sifat), this is scoped to the
 * Konfigurasi Sistem "Kategori Arus Kas" screen and rejects "hpp": HPP is
 * computed exclusively from Realisasi RAB (see profit-loss.ts), so tagging a
 * cashflow category "hpp" here would silently have no effect on the P&L.
 */
export async function createKategoriArusKas(kategori: string, sifat: SifatBeban): Promise<ExpenseNatureRow> {
  await delay(300);
  const trimmed = kategori.trim();
  if (!trimmed) throw new Error("Nama kategori wajib diisi.");
  if (LOCKED_KATEGORI.has(trimmed)) throw new Error("Nama kategori bentrok dengan kategori inti.");
  if (expenseNatureFixtures.some((e) => e.kategori.toLowerCase() === trimmed.toLowerCase()))
    throw new Error("Item dengan nama ini sudah ada.");
  if (sifat === "hpp") throw new Error("Sifat beban HPP tidak berlaku untuk kategori Arus Kas.");
  const entry = expenseNatureEntrySchema.parse({ kategori: trimmed, sifat });
  expenseNatureFixtures.push(entry);
  return { ...entry, locked: false };
}

export async function deleteKategoriArusKas(kategori: string): Promise<void> {
  await delay(300);
  if (LOCKED_KATEGORI.has(kategori)) throw new Error("Kategori inti tidak dapat dihapus.");
  const idx = expenseNatureFixtures.findIndex((e) => e.kategori === kategori);
  if (idx !== -1) expenseNatureFixtures.splice(idx, 1);
}
