import { desc, eq } from "drizzle-orm";
import { withUserTransaction } from "@/lib/db/tx";
import { schema } from "@/lib/db/client";
import { NotFoundError } from "@/lib/api-error";
import { toSignatureTemplate } from "@/lib/signature-templates/mapping";
import type {
  SignatureTemplate, CreateSignatureTemplateInput, UpdateSignatureTemplateInput,
} from "@/lib/schemas/signature-templates";

export { toSignatureTemplate } from "@/lib/signature-templates/mapping";

export async function listSignatureTemplates(userId: string): Promise<SignatureTemplate[]> {
  return withUserTransaction(userId, async (tx) => {
    const rows = await tx
      .select()
      .from(schema.signatureTemplates)
      .orderBy(desc(schema.signatureTemplates.createdAt));
    return rows.map(toSignatureTemplate);
  });
}

export async function createSignatureTemplate(userId: string, input: CreateSignatureTemplateInput): Promise<SignatureTemplate> {
  return withUserTransaction(userId, async (tx) => {
    const [row] = await tx
      .insert(schema.signatureTemplates)
      .values({ name: input.nama, signatureImage: input.signatureImage })
      .returning();
    return toSignatureTemplate(row);
  });
}

export async function updateSignatureTemplate(
  userId: string,
  id: string,
  input: UpdateSignatureTemplateInput,
): Promise<SignatureTemplate> {
  return withUserTransaction(userId, async (tx) => {
    const [existing] = await tx.select({ id: schema.signatureTemplates.id }).from(schema.signatureTemplates).where(eq(schema.signatureTemplates.id, id)).limit(1);
    if (!existing) throw new NotFoundError("Template Tanda Tangan tidak ditemukan.");

    const [row] = await tx
      .update(schema.signatureTemplates)
      .set({
        ...(input.nama !== undefined && { name: input.nama }),
        ...(input.signatureImage !== undefined && { signatureImage: input.signatureImage }),
        updatedAt: new Date(),
      })
      .where(eq(schema.signatureTemplates.id, id))
      .returning();
    return toSignatureTemplate(row);
  });
}

export async function deleteSignatureTemplate(userId: string, id: string): Promise<void> {
  await withUserTransaction(userId, async (tx) => {
    const [existing] = await tx.select({ id: schema.signatureTemplates.id }).from(schema.signatureTemplates).where(eq(schema.signatureTemplates.id, id)).limit(1);
    if (!existing) throw new NotFoundError("Template Tanda Tangan tidak ditemukan.");
    await tx.delete(schema.signatureTemplates).where(eq(schema.signatureTemplates.id, id));
  });
}
