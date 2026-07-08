import { desc, eq, inArray } from "drizzle-orm";
import { withUserTransaction, type Tx } from "@/lib/db/tx";
import { schema } from "@/lib/db/client";
import { NotFoundError } from "@/lib/api-error";
import { toKelengkapanTemplate, type KelengkapanTemplateRow } from "@/lib/kelengkapan/mapping";
import type { KelengkapanTemplate, CreateKelengkapanInput, UpdateKelengkapanInput } from "@/lib/schemas/kelengkapan";

export { toKelengkapanTemplate } from "@/lib/kelengkapan/mapping";

async function loadItems(tx: Tx, templateIds: string[]) {
  if (!templateIds.length) return new Map<string, typeof schema.kelengkapanTemplateItems.$inferSelect[]>();
  const rows = await tx
    .select()
    .from(schema.kelengkapanTemplateItems)
    .where(inArray(schema.kelengkapanTemplateItems.templateId, templateIds));
  const byTemplateId = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = byTemplateId.get(row.templateId) ?? [];
    list.push(row);
    byTemplateId.set(row.templateId, list);
  }
  return byTemplateId;
}

async function insertItems(tx: Tx, templateId: string, items: { persyaratan: string }[]) {
  if (!items.length) return;
  await tx.insert(schema.kelengkapanTemplateItems).values(
    items.map((item, i) => ({ templateId, persyaratan: item.persyaratan, sortOrder: i })),
  );
}

export async function listTemplates(userId: string): Promise<KelengkapanTemplate[]> {
  return withUserTransaction(userId, async (tx) => {
    const rows = await tx
      .select()
      .from(schema.kelengkapanTemplates)
      .orderBy(desc(schema.kelengkapanTemplates.createdAt));
    const itemsByTemplateId = await loadItems(tx, rows.map((r) => r.id));
    return rows.map((row) => toKelengkapanTemplate(row, itemsByTemplateId.get(row.id) ?? []));
  });
}

async function getTemplateRow(tx: Tx, id: string): Promise<KelengkapanTemplateRow> {
  const [row] = await tx
    .select()
    .from(schema.kelengkapanTemplates)
    .where(eq(schema.kelengkapanTemplates.id, id))
    .limit(1);
  if (!row) throw new NotFoundError("Template Kelengkapan tidak ditemukan.");
  return row;
}

export async function getTemplate(userId: string, id: string): Promise<KelengkapanTemplate> {
  return withUserTransaction(userId, async (tx) => {
    const row = await getTemplateRow(tx, id);
    const itemsByTemplateId = await loadItems(tx, [id]);
    return toKelengkapanTemplate(row, itemsByTemplateId.get(id) ?? []);
  });
}

export async function createTemplate(userId: string, input: CreateKelengkapanInput): Promise<KelengkapanTemplate> {
  void userId;
  return withUserTransaction(userId, async (tx) => {
    const [row] = await tx
      .insert(schema.kelengkapanTemplates)
      .values({ name: input.nama })
      .returning();
    await insertItems(tx, row.id, input.items);
    const itemsByTemplateId = await loadItems(tx, [row.id]);
    return toKelengkapanTemplate(row, itemsByTemplateId.get(row.id) ?? []);
  });
}

export async function updateTemplate(
  userId: string,
  id: string,
  input: UpdateKelengkapanInput,
): Promise<KelengkapanTemplate> {
  void userId;
  return withUserTransaction(userId, async (tx) => {
    await getTemplateRow(tx, id);

    const [row] = await tx
      .update(schema.kelengkapanTemplates)
      .set({
        ...(input.nama !== undefined && { name: input.nama }),
        updatedAt: new Date(),
      })
      .where(eq(schema.kelengkapanTemplates.id, id))
      .returning();

    if (input.items !== undefined) {
      await tx.delete(schema.kelengkapanTemplateItems).where(eq(schema.kelengkapanTemplateItems.templateId, id));
      await insertItems(tx, id, input.items);
    }

    const itemsByTemplateId = await loadItems(tx, [id]);
    return toKelengkapanTemplate(row, itemsByTemplateId.get(id) ?? []);
  });
}

export async function deleteTemplate(userId: string, id: string): Promise<void> {
  await withUserTransaction(userId, async (tx) => {
    await getTemplateRow(tx, id);
    await tx.delete(schema.kelengkapanTemplates).where(eq(schema.kelengkapanTemplates.id, id));
  });
}
