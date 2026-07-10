import { z } from "zod";

/** Entities managed via Konfigurasi's Workflow Status tab. `penawaran` is
 * deliberately excluded — its status display still keys off a hardcoded
 * label dictionary (src/lib/penawaran/mapping.ts), so free-label rename/
 * delete here would silently break it. */
export const workflowStatusEntity = z.enum(["proyek", "milestone", "faktur", "penggajian"]);
export type WorkflowStatusEntityAdmin = z.infer<typeof workflowStatusEntity>;

export const workflowStatusSystemRole = z.enum(["SELESAI", "LUNAS", "DIBAYAR", "BATAL"]);
export type WorkflowStatusSystemRole = z.infer<typeof workflowStatusSystemRole>;

export const workflowStatusRowSchema = z.object({
  id: z.string(),
  entity: workflowStatusEntity,
  label: z.string(),
  color: z.string().nullable(),
  systemRole: workflowStatusSystemRole.nullable(),
  isDefault: z.boolean(),
  isSystem: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.number(),
});
export type WorkflowStatusRow = z.infer<typeof workflowStatusRowSchema>;

export const createWorkflowStatusSchema = z.object({
  entity: workflowStatusEntity,
  label: z.string().min(1, "Label wajib diisi."),
});
export type CreateWorkflowStatusInput = z.infer<typeof createWorkflowStatusSchema>;

export const updateWorkflowStatusSchema = z.object({
  label: z.string().min(1).optional(),
  systemRole: workflowStatusSystemRole.nullable().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateWorkflowStatusInput = z.infer<typeof updateWorkflowStatusSchema>;
