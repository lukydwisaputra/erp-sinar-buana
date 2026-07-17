import { desc, eq, inArray } from "drizzle-orm";
import { withUserTransaction, type Tx } from "@/lib/db/tx";
import { schema } from "@/lib/db/client";
import { NotFoundError } from "@/lib/api-error";
import { toJadwalTemplate, type JadwalTemplateRow } from "@/lib/jadwal-templates/mapping";
import type {
  JadwalTemplate, CreateJadwalTemplateInput, UpdateJadwalTemplateInput,
} from "@/lib/schemas/jadwal-templates";

export { toJadwalTemplate } from "@/lib/jadwal-templates/mapping";

async function loadRowsAndWeeks(tx: Tx, templateIds: string[]) {
  if (!templateIds.length) {
    return {
      rowsByTemplateId: new Map<string, typeof schema.jadwalTemplateRows.$inferSelect[]>(),
      weeksByRowId: new Map<string, typeof schema.jadwalTemplateMarkedWeeks.$inferSelect[]>(),
    };
  }
  const rows = await tx
    .select()
    .from(schema.jadwalTemplateRows)
    .where(inArray(schema.jadwalTemplateRows.templateId, templateIds));
  const rowIds = rows.map((r) => r.id);
  const weeks = rowIds.length
    ? await tx
        .select()
        .from(schema.jadwalTemplateMarkedWeeks)
        .where(inArray(schema.jadwalTemplateMarkedWeeks.rowId, rowIds))
    : [];

  const rowsByTemplateId = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = rowsByTemplateId.get(row.templateId) ?? [];
    list.push(row);
    rowsByTemplateId.set(row.templateId, list);
  }
  const weeksByRowId = new Map<string, typeof weeks>();
  for (const w of weeks) {
    const list = weeksByRowId.get(w.rowId) ?? [];
    list.push(w);
    weeksByRowId.set(w.rowId, list);
  }
  return { rowsByTemplateId, weeksByRowId };
}

function weeksForTemplate(
  templateId: string,
  rowsByTemplateId: Map<string, { id: string }[]>,
  weeksByRowId: Map<string, { rowId: string; weekNumber: number }[]>,
) {
  const rows = rowsByTemplateId.get(templateId) ?? [];
  return rows.flatMap((r) => weeksByRowId.get(r.id) ?? []);
}

async function insertRows(
  tx: Tx,
  templateId: string,
  kegiatan: string[],
  highlights: number[][],
) {
  if (!kegiatan.length) return;
  const rows = await tx
    .insert(schema.jadwalTemplateRows)
    .values(kegiatan.map((activityName, i) => ({ templateId, activityName, sortOrder: i })))
    .returning();
  const weekValues = rows.flatMap((row, i) =>
    (highlights[i] ?? []).map((weekNumber) => ({ rowId: row.id, weekNumber })),
  );
  if (weekValues.length) {
    await tx.insert(schema.jadwalTemplateMarkedWeeks).values(weekValues);
  }
}

export async function listJadwalTemplates(userId: string): Promise<JadwalTemplate[]> {
  return withUserTransaction(userId, async (tx) => {
    const rows = await tx
      .select()
      .from(schema.jadwalTemplates)
      .orderBy(desc(schema.jadwalTemplates.createdAt));
    const { rowsByTemplateId, weeksByRowId } = await loadRowsAndWeeks(tx, rows.map((r) => r.id));
    return rows.map((row) =>
      toJadwalTemplate(row, rowsByTemplateId.get(row.id) ?? [], weeksForTemplate(row.id, rowsByTemplateId, weeksByRowId)),
    );
  });
}

async function getTemplateRow(tx: Tx, id: string): Promise<JadwalTemplateRow> {
  const [row] = await tx
    .select()
    .from(schema.jadwalTemplates)
    .where(eq(schema.jadwalTemplates.id, id))
    .limit(1);
  if (!row) throw new NotFoundError("Template Jadwal tidak ditemukan.");
  return row;
}

export async function getJadwalTemplate(userId: string, id: string): Promise<JadwalTemplate> {
  return withUserTransaction(userId, async (tx) => {
    const row = await getTemplateRow(tx, id);
    const { rowsByTemplateId, weeksByRowId } = await loadRowsAndWeeks(tx, [id]);
    return toJadwalTemplate(row, rowsByTemplateId.get(id) ?? [], weeksForTemplate(id, rowsByTemplateId, weeksByRowId));
  });
}

export async function createJadwalTemplate(
  userId: string,
  input: CreateJadwalTemplateInput,
): Promise<JadwalTemplate> {
  return withUserTransaction(userId, async (tx) => {
    const [row] = await tx
      .insert(schema.jadwalTemplates)
      .values({ name: input.nama, numMonths: input.bulan })
      .returning();
    await insertRows(tx, row.id, input.kegiatan, input.highlights);
    const { rowsByTemplateId, weeksByRowId } = await loadRowsAndWeeks(tx, [row.id]);
    return toJadwalTemplate(row, rowsByTemplateId.get(row.id) ?? [], weeksForTemplate(row.id, rowsByTemplateId, weeksByRowId));
  });
}

export async function updateJadwalTemplate(
  userId: string,
  id: string,
  input: UpdateJadwalTemplateInput,
): Promise<JadwalTemplate> {
  return withUserTransaction(userId, async (tx) => {
    await getTemplateRow(tx, id);

    const [row] = await tx
      .update(schema.jadwalTemplates)
      .set({
        ...(input.nama !== undefined && { name: input.nama }),
        ...(input.bulan !== undefined && { numMonths: input.bulan }),
        updatedAt: new Date(),
      })
      .where(eq(schema.jadwalTemplates.id, id))
      .returning();

    if (input.kegiatan !== undefined || input.highlights !== undefined) {
      const existing = await loadRowsAndWeeks(tx, [id]);
      const current = toJadwalTemplate(
        row,
        existing.rowsByTemplateId.get(id) ?? [],
        weeksForTemplate(id, existing.rowsByTemplateId, existing.weeksByRowId),
      );
      await tx.delete(schema.jadwalTemplateRows).where(eq(schema.jadwalTemplateRows.templateId, id));
      await insertRows(
        tx,
        id,
        input.kegiatan ?? current.kegiatan,
        input.highlights ?? current.highlights,
      );
    }

    const { rowsByTemplateId, weeksByRowId } = await loadRowsAndWeeks(tx, [id]);
    return toJadwalTemplate(row, rowsByTemplateId.get(id) ?? [], weeksForTemplate(id, rowsByTemplateId, weeksByRowId));
  });
}

export async function deleteJadwalTemplate(userId: string, id: string): Promise<void> {
  await withUserTransaction(userId, async (tx) => {
    await getTemplateRow(tx, id);
    await tx.delete(schema.jadwalTemplates).where(eq(schema.jadwalTemplates.id, id));
  });
}
