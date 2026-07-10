import { z } from "zod";

export const terminTemplateStepSchema = z.object({
  label: z.string(),
  persen: z.number().min(0).max(100),
  pemicu: z.string(),
});
export type TerminTemplateStep = z.infer<typeof terminTemplateStepSchema>;

export const terminTemplateSchema = z.object({
  id: z.string(), // uuid (termin_templates.id)
  nama: z.string(),
  steps: z.array(terminTemplateStepSchema),
});
export type TerminTemplate = z.infer<typeof terminTemplateSchema>;

/** API input schema — server-side validation for POST/PATCH /api/termin-templates. */
export const createTerminTemplateSchema = z.object({
  nama: z.string().min(1, "Nama template wajib diisi."),
  steps: z.array(terminTemplateStepSchema).min(1, "Tambahkan minimal satu termin."),
});
export type CreateTerminTemplateInput = z.infer<typeof createTerminTemplateSchema>;

export const updateTerminTemplateSchema = z.object({
  nama: z.string().min(1).optional(),
  steps: z.array(terminTemplateStepSchema).min(1).optional(),
});
export type UpdateTerminTemplateInput = z.infer<typeof updateTerminTemplateSchema>;
