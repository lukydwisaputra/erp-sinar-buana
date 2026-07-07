import { desc, inArray, isNull } from "drizzle-orm";
import { withUserTransaction } from "@/lib/db/tx";
import { schema } from "@/lib/db/client";
import { toArusKasEntry } from "@/lib/arus-kas/mapping";
import type { ArusKasEntry } from "@/lib/schemas/arus-kas";

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
