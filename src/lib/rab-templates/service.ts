import { desc, eq, inArray } from "drizzle-orm";
import { withUserTransaction, type Tx } from "@/lib/db/tx";
import { schema } from "@/lib/db/client";
import { NotFoundError } from "@/lib/api-error";
import { toRabTemplate, type RabTemplateRow } from "@/lib/rab-templates/mapping";
import type {
  RabTemplate, CreateRabTemplateInput, UpdateRabTemplateInput,
} from "@/lib/schemas/rab-templates";

export { toRabTemplate } from "@/lib/rab-templates/mapping";

async function loadRows(tx: Tx, templateIds: string[]) {
  if (!templateIds.length) return new Map<string, typeof schema.rabTemplateRows.$inferSelect[]>();
  const rows = await tx
    .select()
    .from(schema.rabTemplateRows)
    .where(inArray(schema.rabTemplateRows.templateId, templateIds));
  const byTemplateId = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = byTemplateId.get(row.templateId) ?? [];
    list.push(row);
    byTemplateId.set(row.templateId, list);
  }
  return byTemplateId;
}

async function insertRows(
  tx: Tx,
  templateId: string,
  personil: { uraian: string; vol: number; satuan: string; hargaSatuan: number }[],
  langsung: { uraian: string; vol: number; satuan: string; hargaSatuan: number }[],
) {
  const rows = [
    ...personil.map((r, i) => ({ section: "personil", ...r, sortOrder: i })),
    ...langsung.map((r, i) => ({ section: "langsung", ...r, sortOrder: i })),
  ];
  if (!rows.length) return;
  await tx.insert(schema.rabTemplateRows).values(
    rows.map((r) => ({
      templateId,
      section: r.section,
      uraian: r.uraian,
      volume: String(r.vol),
      unit: r.satuan || null,
      unitPrice: String(r.hargaSatuan),
      sortOrder: r.sortOrder,
    })),
  );
}

export async function listRabTemplates(userId: string): Promise<RabTemplate[]> {
  return withUserTransaction(userId, async (tx) => {
    const rows = await tx
      .select()
      .from(schema.rabTemplates)
      .orderBy(desc(schema.rabTemplates.createdAt));
    const rowsByTemplateId = await loadRows(tx, rows.map((r) => r.id));
    return rows.map((row) => toRabTemplate(row, rowsByTemplateId.get(row.id) ?? []));
  });
}

async function getTemplateRow(tx: Tx, id: string): Promise<RabTemplateRow> {
  const [row] = await tx
    .select()
    .from(schema.rabTemplates)
    .where(eq(schema.rabTemplates.id, id))
    .limit(1);
  if (!row) throw new NotFoundError("Template RAB tidak ditemukan.");
  return row;
}

export async function getRabTemplate(userId: string, id: string): Promise<RabTemplate> {
  return withUserTransaction(userId, async (tx) => {
    const row = await getTemplateRow(tx, id);
    const rowsByTemplateId = await loadRows(tx, [id]);
    return toRabTemplate(row, rowsByTemplateId.get(id) ?? []);
  });
}

export async function createRabTemplate(
  userId: string,
  input: CreateRabTemplateInput,
): Promise<RabTemplate> {
  return withUserTransaction(userId, async (tx) => {
    const [row] = await tx
      .insert(schema.rabTemplates)
      .values({ name: input.nama })
      .returning();
    await insertRows(tx, row.id, input.personil, input.langsung);
    const rowsByTemplateId = await loadRows(tx, [row.id]);
    return toRabTemplate(row, rowsByTemplateId.get(row.id) ?? []);
  });
}

export async function updateRabTemplate(
  userId: string,
  id: string,
  input: UpdateRabTemplateInput,
): Promise<RabTemplate> {
  return withUserTransaction(userId, async (tx) => {
    await getTemplateRow(tx, id);

    const [row] = await tx
      .update(schema.rabTemplates)
      .set({
        ...(input.nama !== undefined && { name: input.nama }),
        updatedAt: new Date(),
      })
      .where(eq(schema.rabTemplates.id, id))
      .returning();

    if (input.personil !== undefined || input.langsung !== undefined) {
      const existing = await loadRows(tx, [id]);
      const current = toRabTemplate(row, existing.get(id) ?? []);
      await tx.delete(schema.rabTemplateRows).where(eq(schema.rabTemplateRows.templateId, id));
      await insertRows(
        tx,
        id,
        input.personil ?? current.personil,
        input.langsung ?? current.langsung,
      );
    }

    const rowsByTemplateId = await loadRows(tx, [id]);
    return toRabTemplate(row, rowsByTemplateId.get(id) ?? []);
  });
}

export async function deleteRabTemplate(userId: string, id: string): Promise<void> {
  await withUserTransaction(userId, async (tx) => {
    await getTemplateRow(tx, id);
    await tx.delete(schema.rabTemplates).where(eq(schema.rabTemplates.id, id));
  });
}
