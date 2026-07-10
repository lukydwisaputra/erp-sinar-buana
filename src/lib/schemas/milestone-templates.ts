import { z } from "zod";

export const milestoneTemplateStepSchema = z.object({
  nama: z.string(),
  triggersTerm: z.boolean(),
});
export type MilestoneTemplateStep = z.infer<typeof milestoneTemplateStepSchema>;

export const milestoneTemplateSchema = z.object({
  id: z.string(), // uuid (milestone_templates.id)
  nama: z.string(),
  steps: z.array(milestoneTemplateStepSchema),
});
export type MilestoneTemplate = z.infer<typeof milestoneTemplateSchema>;

/** API input schema — server-side validation for POST/PATCH /api/milestone-templates. */
export const createMilestoneTemplateSchema = z.object({
  nama: z.string().min(1, "Nama template wajib diisi."),
  steps: z.array(milestoneTemplateStepSchema).min(1, "Tambahkan minimal satu tahap."),
});
export type CreateMilestoneTemplateInput = z.infer<typeof createMilestoneTemplateSchema>;

export const updateMilestoneTemplateSchema = z.object({
  nama: z.string().min(1).optional(),
  steps: z.array(milestoneTemplateStepSchema).min(1).optional(),
});
export type UpdateMilestoneTemplateInput = z.infer<typeof updateMilestoneTemplateSchema>;
