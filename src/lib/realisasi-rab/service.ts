import { and, desc, eq, isNull } from "drizzle-orm";
import { withUserTransaction } from "@/lib/db/tx";
import { schema } from "@/lib/db/client";
import { NotFoundError } from "@/lib/api-error";
import { toRealisasiRab, RAB_CATEGORY_BY_KATEGORI } from "@/lib/realisasi-rab/mapping";
import type { RealisasiRab, RealisasiRabFormValues } from "@/lib/schemas/realisasi-rab";

export { toRealisasiRab } from "@/lib/realisasi-rab/mapping";

/** Unscoped — used by Dasbor's (still-mock) profitability/alerts computation,
 * which needs every project's actuals at once. RLS naturally restricts this
 * to Admin/Keuangan (rab_actuals_sel) — a non-Finance caller simply gets an
 * empty result, degrading the dashboard's cost data rather than erroring. */
export async function listAll(userId: string): Promise<RealisasiRab[]> {
  return withUserTransaction(userId, async (tx) => {
    const rows = await tx.select().from(schema.rabActuals).where(isNull(schema.rabActuals.deletedAt));
    return rows.map(toRealisasiRab);
  });
}

export async function listByProyek(userId: string, proyekId: string): Promise<RealisasiRab[]> {
  return withUserTransaction(userId, async (tx) => {
    const rows = await tx
      .select()
      .from(schema.rabActuals)
      .where(and(eq(schema.rabActuals.projectId, proyekId), isNull(schema.rabActuals.deletedAt)))
      .orderBy(desc(schema.rabActuals.date));
    return rows.map(toRealisasiRab);
  });
}

export async function create(userId: string, input: RealisasiRabFormValues): Promise<RealisasiRab> {
  return withUserTransaction(userId, async (tx) => {
    const [row] = await tx
      .insert(schema.rabActuals)
      .values({
        projectId: input.proyekId,
        rabCategory: RAB_CATEGORY_BY_KATEGORI[input.kategori],
        rabLineLabel: input.rabLineLabel,
        amount: String(input.jumlah),
        date: input.tanggal,
        note: input.keterangan,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();
    return toRealisasiRab(row);
  });
}

export async function update(userId: string, id: string, input: RealisasiRabFormValues): Promise<RealisasiRab> {
  return withUserTransaction(userId, async (tx) => {
    const [existing] = await tx
      .select({ id: schema.rabActuals.id })
      .from(schema.rabActuals)
      .where(and(eq(schema.rabActuals.id, id), isNull(schema.rabActuals.deletedAt)))
      .limit(1);
    if (!existing) throw new NotFoundError("Realisasi RAB tidak ditemukan.");

    const [row] = await tx
      .update(schema.rabActuals)
      .set({
        rabCategory: RAB_CATEGORY_BY_KATEGORI[input.kategori],
        rabLineLabel: input.rabLineLabel,
        amount: String(input.jumlah),
        date: input.tanggal,
        note: input.keterangan,
        updatedBy: userId,
      })
      .where(eq(schema.rabActuals.id, id))
      .returning();
    return toRealisasiRab(row);
  });
}

export async function remove(userId: string, id: string): Promise<void> {
  await withUserTransaction(userId, async (tx) => {
    const [existing] = await tx
      .select({ id: schema.rabActuals.id })
      .from(schema.rabActuals)
      .where(and(eq(schema.rabActuals.id, id), isNull(schema.rabActuals.deletedAt)))
      .limit(1);
    if (!existing) throw new NotFoundError("Realisasi RAB tidak ditemukan.");
    await tx.update(schema.rabActuals).set({ deletedAt: new Date(), deletedBy: userId }).where(eq(schema.rabActuals.id, id));
  });
}
