import { desc, eq, inArray } from "drizzle-orm";
import { withUserTransaction, type Tx } from "@/lib/db/tx";
import { schema } from "@/lib/db/client";
import { NotFoundError } from "@/lib/api-error";
import { toMilestoneTemplate, type MilestoneTemplateRow } from "@/lib/milestone-templates/mapping";
import type {
  MilestoneTemplate, CreateMilestoneTemplateInput, UpdateMilestoneTemplateInput,
} from "@/lib/schemas/milestone-templates";

export { toMilestoneTemplate } from "@/lib/milestone-templates/mapping";

async function loadSteps(tx: Tx, templateIds: string[]) {
  if (!templateIds.length) return new Map<string, typeof schema.milestoneTemplateSteps.$inferSelect[]>();
  const rows = await tx
    .select()
    .from(schema.milestoneTemplateSteps)
    .where(inArray(schema.milestoneTemplateSteps.templateId, templateIds));
  const byTemplateId = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = byTemplateId.get(row.templateId) ?? [];
    list.push(row);
    byTemplateId.set(row.templateId, list);
  }
  return byTemplateId;
}

async function insertSteps(tx: Tx, templateId: string, steps: { nama: string; triggersTerm: boolean }[]) {
  if (!steps.length) return;
  await tx.insert(schema.milestoneTemplateSteps).values(
    steps.map((s, i) => ({ templateId, name: s.nama, triggersTerm: s.triggersTerm, sortOrder: i })),
  );
}

export async function listMilestoneTemplates(userId: string): Promise<MilestoneTemplate[]> {
  return withUserTransaction(userId, async (tx) => {
    const rows = await tx
      .select()
      .from(schema.milestoneTemplates)
      .orderBy(desc(schema.milestoneTemplates.createdAt));
    const stepsByTemplateId = await loadSteps(tx, rows.map((r) => r.id));
    return rows.map((row) => toMilestoneTemplate(row, stepsByTemplateId.get(row.id) ?? []));
  });
}

async function getTemplateRow(tx: Tx, id: string): Promise<MilestoneTemplateRow> {
  const [row] = await tx
    .select()
    .from(schema.milestoneTemplates)
    .where(eq(schema.milestoneTemplates.id, id))
    .limit(1);
  if (!row) throw new NotFoundError("Template milestone tidak ditemukan.");
  return row;
}

export async function getMilestoneTemplate(userId: string, id: string): Promise<MilestoneTemplate> {
  return withUserTransaction(userId, async (tx) => {
    const row = await getTemplateRow(tx, id);
    const stepsByTemplateId = await loadSteps(tx, [id]);
    return toMilestoneTemplate(row, stepsByTemplateId.get(id) ?? []);
  });
}

export async function createMilestoneTemplate(
  userId: string,
  input: CreateMilestoneTemplateInput,
): Promise<MilestoneTemplate> {
  return withUserTransaction(userId, async (tx) => {
    const [row] = await tx
      .insert(schema.milestoneTemplates)
      .values({ name: input.nama })
      .returning();
    await insertSteps(tx, row.id, input.steps);
    const stepsByTemplateId = await loadSteps(tx, [row.id]);
    return toMilestoneTemplate(row, stepsByTemplateId.get(row.id) ?? []);
  });
}

export async function updateMilestoneTemplate(
  userId: string,
  id: string,
  input: UpdateMilestoneTemplateInput,
): Promise<MilestoneTemplate> {
  return withUserTransaction(userId, async (tx) => {
    await getTemplateRow(tx, id);

    const [row] = await tx
      .update(schema.milestoneTemplates)
      .set({
        ...(input.nama !== undefined && { name: input.nama }),
        updatedAt: new Date(),
      })
      .where(eq(schema.milestoneTemplates.id, id))
      .returning();

    if (input.steps !== undefined) {
      await tx.delete(schema.milestoneTemplateSteps).where(eq(schema.milestoneTemplateSteps.templateId, id));
      await insertSteps(tx, id, input.steps);
    }

    const stepsByTemplateId = await loadSteps(tx, [id]);
    return toMilestoneTemplate(row, stepsByTemplateId.get(id) ?? []);
  });
}

export async function deleteMilestoneTemplate(userId: string, id: string): Promise<void> {
  await withUserTransaction(userId, async (tx) => {
    await getTemplateRow(tx, id);
    await tx.delete(schema.milestoneTemplates).where(eq(schema.milestoneTemplates.id, id));
  });
}
