import { z } from "zod";

export const templateJenis = z.enum(["milestone", "pdf", "termin"]);
export type TemplateJenis = z.infer<typeof templateJenis>;

export const milestoneTemplateStepSchema = z.object({ nama: z.string().min(1), urutan: z.number() });
export type MilestoneTemplateStep = z.infer<typeof milestoneTemplateStepSchema>;

export const terminTemplateStepSchema = z.object({
  label: z.string().min(1),
  persen: z.number().min(0).max(100),
  pemicu: z.string(),
});
export type TerminTemplateStep = z.infer<typeof terminTemplateStepSchema>;

export const pdfTemplateMetaSchema = z.object({
  headerNote: z.string(),
  footerNote: z.string(),
});
export type PdfTemplateMeta = z.infer<typeof pdfTemplateMetaSchema>;

export const templateSchema = z.object({
  id: z.string(),
  jenis: templateJenis,
  nama: z.string().min(1),
  /** Free-text link to a Layanan.jenisDokumen, informational only. */
  jenisLayananTerkait: z.string().nullable(),
  aktif: z.boolean(),
  // Exactly one of these is populated, based on `jenis`.
  milestoneSteps: z.array(milestoneTemplateStepSchema).default([]),
  terminSteps: z.array(terminTemplateStepSchema).default([]),
  pdfMeta: pdfTemplateMetaSchema.nullable().default(null),
  createdAt: z.string(),
});
export type Template = z.infer<typeof templateSchema>;
