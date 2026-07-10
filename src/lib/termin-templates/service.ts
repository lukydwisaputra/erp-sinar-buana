import { desc, eq, inArray } from "drizzle-orm";
import { withUserTransaction, type Tx } from "@/lib/db/tx";
import { schema } from "@/lib/db/client";
import { NotFoundError } from "@/lib/api-error";
import { toTerminTemplate, type TerminTemplateRow } from "@/lib/termin-templates/mapping";
import type {
  TerminTemplate, CreateTerminTemplateInput, UpdateTerminTemplateInput,
} from "@/lib/schemas/termin-templates";

export { toTerminTemplate } from "@/lib/termin-templates/mapping";

async function loadSteps(tx: Tx, templateIds: string[]) {
  if (!templateIds.length) return new Map<string, typeof schema.terminTemplateSteps.$inferSelect[]>();
  const rows = await tx
    .select()
    .from(schema.terminTemplateSteps)
    .where(inArray(schema.terminTemplateSteps.templateId, templateIds));
  const byTemplateId = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = byTemplateId.get(row.templateId) ?? [];
    list.push(row);
    byTemplateId.set(row.templateId, list);
  }
  return byTemplateId;
}

async function insertSteps(
  tx: Tx,
  templateId: string,
  steps: { label: string; persen: number; pemicu: string }[],
) {
  if (!steps.length) return;
  await tx.insert(schema.terminTemplateSteps).values(
    steps.map((s, i) => ({
      templateId,
      label: s.label,
      percentage: String(s.persen),
      milestoneTriggerLabel: s.pemicu || null,
      sortOrder: i,
    })),
  );
}

export async function listTerminTemplates(userId: string): Promise<TerminTemplate[]> {
  return withUserTransaction(userId, async (tx) => {
    const rows = await tx
      .select()
      .from(schema.terminTemplates)
      .orderBy(desc(schema.terminTemplates.createdAt));
    const stepsByTemplateId = await loadSteps(tx, rows.map((r) => r.id));
    return rows.map((row) => toTerminTemplate(row, stepsByTemplateId.get(row.id) ?? []));
  });
}

async function getTemplateRow(tx: Tx, id: string): Promise<TerminTemplateRow> {
  const [row] = await tx
    .select()
    .from(schema.terminTemplates)
    .where(eq(schema.terminTemplates.id, id))
    .limit(1);
  if (!row) throw new NotFoundError("Template termin tidak ditemukan.");
  return row;
}

export async function getTerminTemplate(userId: string, id: string): Promise<TerminTemplate> {
  return withUserTransaction(userId, async (tx) => {
    const row = await getTemplateRow(tx, id);
    const stepsByTemplateId = await loadSteps(tx, [id]);
    return toTerminTemplate(row, stepsByTemplateId.get(id) ?? []);
  });
}

export async function createTerminTemplate(
  userId: string,
  input: CreateTerminTemplateInput,
): Promise<TerminTemplate> {
  return withUserTransaction(userId, async (tx) => {
    const [row] = await tx
      .insert(schema.terminTemplates)
      .values({ name: input.nama })
      .returning();
    await insertSteps(tx, row.id, input.steps);
    const stepsByTemplateId = await loadSteps(tx, [row.id]);
    return toTerminTemplate(row, stepsByTemplateId.get(row.id) ?? []);
  });
}

export async function updateTerminTemplate(
  userId: string,
  id: string,
  input: UpdateTerminTemplateInput,
): Promise<TerminTemplate> {
  return withUserTransaction(userId, async (tx) => {
    await getTemplateRow(tx, id);

    const [row] = await tx
      .update(schema.terminTemplates)
      .set({
        ...(input.nama !== undefined && { name: input.nama }),
        updatedAt: new Date(),
      })
      .where(eq(schema.terminTemplates.id, id))
      .returning();

    if (input.steps !== undefined) {
      await tx.delete(schema.terminTemplateSteps).where(eq(schema.terminTemplateSteps.templateId, id));
      await insertSteps(tx, id, input.steps);
    }

    const stepsByTemplateId = await loadSteps(tx, [id]);
    return toTerminTemplate(row, stepsByTemplateId.get(id) ?? []);
  });
}

export async function deleteTerminTemplate(userId: string, id: string): Promise<void> {
  await withUserTransaction(userId, async (tx) => {
    await getTemplateRow(tx, id);
    await tx.delete(schema.terminTemplates).where(eq(schema.terminTemplates.id, id));
  });
}
