import { z } from "zod";

export const pdfTemplateDocumentType = z.enum(["sph", "invoice", "slip_gaji"]);
export type PdfTemplateDocumentType = z.infer<typeof pdfTemplateDocumentType>;

export const pdfTemplateSchema = z.object({
  id: z.string(), // uuid (pdf_templates.id)
  nama: z.string(),
  documentType: pdfTemplateDocumentType,
  headerNote: z.string(),
  footerNote: z.string(),
});
export type PdfTemplate = z.infer<typeof pdfTemplateSchema>;

/** API input schema — server-side validation for POST/PATCH /api/pdf-templates. */
export const createPdfTemplateSchema = z.object({
  nama: z.string().min(1, "Nama template wajib diisi."),
  documentType: pdfTemplateDocumentType,
  headerNote: z.string().optional(),
  footerNote: z.string().optional(),
});
export type CreatePdfTemplateInput = z.infer<typeof createPdfTemplateSchema>;

export const updatePdfTemplateSchema = z.object({
  nama: z.string().min(1).optional(),
  documentType: pdfTemplateDocumentType.optional(),
  headerNote: z.string().optional(),
  footerNote: z.string().optional(),
});
export type UpdatePdfTemplateInput = z.infer<typeof updatePdfTemplateSchema>;
