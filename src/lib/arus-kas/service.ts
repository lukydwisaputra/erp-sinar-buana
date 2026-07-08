import { asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { withUserTransaction } from "@/lib/db/tx";
import { schema } from "@/lib/db/client";
import { ConflictError, NotFoundError } from "@/lib/api-error";
import { toArusKasEntry, toCashflowCategoryRow, toDbSifat } from "@/lib/arus-kas/mapping";
import type { ArusKasEntry } from "@/lib/schemas/arus-kas";
import type {
  CashflowCategoryRow,
  CreateCashflowCategoryInput,
  SifatBeban,
} from "@/lib/schemas/expense-nature";

/** Read-only visibility — rows are produced by document triggers (Faktur's
 * LUNAS automation); manual-entry CRUD stays out of scope this pass. */
export async function listArusKas(userId: string): Promise<ArusKasEntry[]> {
  return withUserTransaction(userId, async (tx) => {
    const rows = await tx
      .select()
      .from(schema.cashflowEntries)
      .where(isNull(schema.cashflowEntries.deletedAt))
      .orderBy(desc(schema.cashflowEntries.date));

    const categoryIds = [...new Set(rows.map((r) => r.categoryId).filter((x): x is string => !!x))];
    const categories = categoryIds.length
      ? await tx.select({ id: schema.cashflowCategories.id, label: schema.cashflowCategories.label }).from(schema.cashflowCategories).where(inArray(schema.cashflowCategories.id, categoryIds))
      : [];
    const labelById = new Map(categories.map((c) => [c.id, c.label]));

    return rows.map((r) => toArusKasEntry(r, r.categoryId ? labelById.get(r.categoryId) ?? null : null));
  });
}

/** Kategori Arus Kas (Konfigurasi) — sifat-beban classification feeds Dasbor's
 * P&L (see profit-loss.ts). `locked` (real `is_system`) categories can only
 * have their sifat changed, never renamed/deleted. */
export async function listCashflowCategories(userId: string): Promise<CashflowCategoryRow[]> {
  return withUserTransaction(userId, async (tx) => {
    const rows = await tx
      .select()
      .from(schema.cashflowCategories)
      .orderBy(asc(schema.cashflowCategories.sortOrder));
    return rows.map(toCashflowCategoryRow);
  });
}

export async function createCashflowCategory(
  userId: string,
  input: CreateCashflowCategoryInput,
): Promise<CashflowCategoryRow> {
  return withUserTransaction(userId, async (tx) => {
    const trimmed = input.kategori.trim();
    const existingLabels = await tx.select({ label: schema.cashflowCategories.label }).from(schema.cashflowCategories);
    if (existingLabels.some((c) => c.label.toLowerCase() === trimmed.toLowerCase())) {
      throw new ConflictError("Item dengan nama ini sudah ada.");
    }

    const [row] = await tx
      .insert(schema.cashflowCategories)
      .values({ label: trimmed, expenseNature: toDbSifat(input.sifat), isSystem: false })
      .returning();
    return toCashflowCategoryRow(row);
  });
}

export async function updateCategoryExpenseNature(
  userId: string,
  id: string,
  sifat: SifatBeban,
): Promise<CashflowCategoryRow> {
  return withUserTransaction(userId, async (tx) => {
    const [row] = await tx
      .update(schema.cashflowCategories)
      .set({ expenseNature: toDbSifat(sifat) })
      .where(eq(schema.cashflowCategories.id, id))
      .returning();
    if (!row) throw new NotFoundError("Kategori tidak ditemukan.");
    return toCashflowCategoryRow(row);
  });
}

export async function deleteCashflowCategory(userId: string, id: string): Promise<void> {
  return withUserTransaction(userId, async (tx) => {
    const [row] = await tx
      .select({ isSystem: schema.cashflowCategories.isSystem })
      .from(schema.cashflowCategories)
      .where(eq(schema.cashflowCategories.id, id));
    if (!row) throw new NotFoundError("Kategori tidak ditemukan.");
    if (row.isSystem) throw new ConflictError("Kategori inti tidak dapat dihapus.");
    await tx.delete(schema.cashflowCategories).where(eq(schema.cashflowCategories.id, id));
  });
}
