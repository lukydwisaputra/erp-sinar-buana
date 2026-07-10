import { desc, eq } from "drizzle-orm";
import { withUserTransaction } from "@/lib/db/tx";
import { schema } from "@/lib/db/client";
import { NotFoundError } from "@/lib/api-error";
import { toPdfTemplate } from "@/lib/pdf-templates/mapping";
import type { PdfTemplate, CreatePdfTemplateInput, UpdatePdfTemplateInput } from "@/lib/schemas/pdf-templates";

export { toPdfTemplate } from "@/lib/pdf-templates/mapping";

export async function listPdfTemplates(userId: string): Promise<PdfTemplate[]> {
  return withUserTransaction(userId, async (tx) => {
    const rows = await tx
      .select()
      .from(schema.pdfTemplates)
      .orderBy(desc(schema.pdfTemplates.createdAt));
    return rows.map(toPdfTemplate);
  });
}

export async function getPdfTemplate(userId: string, id: string): Promise<PdfTemplate> {
  return withUserTransaction(userId, async (tx) => {
    const [row] = await tx.select().from(schema.pdfTemplates).where(eq(schema.pdfTemplates.id, id)).limit(1);
    if (!row) throw new NotFoundError("Template PDF tidak ditemukan.");
    return toPdfTemplate(row);
  });
}

export async function createPdfTemplate(userId: string, input: CreatePdfTemplateInput): Promise<PdfTemplate> {
  return withUserTransaction(userId, async (tx) => {
    const [row] = await tx
      .insert(schema.pdfTemplates)
      .values({
        name: input.nama,
        documentType: input.documentType,
        headerNote: input.headerNote ?? "",
        footerNote: input.footerNote ?? "",
      })
      .returning();
    return toPdfTemplate(row);
  });
}

export async function updatePdfTemplate(
  userId: string,
  id: string,
  input: UpdatePdfTemplateInput,
): Promise<PdfTemplate> {
  return withUserTransaction(userId, async (tx) => {
    const [existing] = await tx.select({ id: schema.pdfTemplates.id }).from(schema.pdfTemplates).where(eq(schema.pdfTemplates.id, id)).limit(1);
    if (!existing) throw new NotFoundError("Template PDF tidak ditemukan.");

    const [row] = await tx
      .update(schema.pdfTemplates)
      .set({
        ...(input.nama !== undefined && { name: input.nama }),
        ...(input.documentType !== undefined && { documentType: input.documentType }),
        ...(input.headerNote !== undefined && { headerNote: input.headerNote }),
        ...(input.footerNote !== undefined && { footerNote: input.footerNote }),
        updatedAt: new Date(),
      })
      .where(eq(schema.pdfTemplates.id, id))
      .returning();
    return toPdfTemplate(row);
  });
}

export async function deletePdfTemplate(userId: string, id: string): Promise<void> {
  await withUserTransaction(userId, async (tx) => {
    const [existing] = await tx.select({ id: schema.pdfTemplates.id }).from(schema.pdfTemplates).where(eq(schema.pdfTemplates.id, id)).limit(1);
    if (!existing) throw new NotFoundError("Template PDF tidak ditemukan.");
    await tx.delete(schema.pdfTemplates).where(eq(schema.pdfTemplates.id, id));
  });
}
