import { z } from "zod";
import { rabRowSchema } from "@/lib/schemas/penawaran";

/** Reusable RAB templates (Konfigurasi > Template > RAB), applied as a
 * one-time copy into an SPH item's `rab` (personil/langsung) — same shape as
 * `itemRabSchema` in schemas/penawaran.ts, so applying is a direct assign. */
export const rabTemplateSchema = z.object({
  id: z.string(), // uuid (rab_templates.id)
  nama: z.string(),
  personil: z.array(rabRowSchema),
  langsung: z.array(rabRowSchema),
});
export type RabTemplate = z.infer<typeof rabTemplateSchema>;

/** API input schema — server-side validation for POST/PATCH /api/rab-templates. */
export const createRabTemplateSchema = z.object({
  nama: z.string().min(1, "Nama template wajib diisi."),
  personil: z.array(rabRowSchema).default([]),
  langsung: z.array(rabRowSchema).default([]),
}).refine((v) => v.personil.length + v.langsung.length > 0, {
  message: "Tambahkan minimal satu baris RAB.",
  path: ["personil"],
});
export type CreateRabTemplateInput = z.infer<typeof createRabTemplateSchema>;

export const updateRabTemplateSchema = z.object({
  nama: z.string().min(1).optional(),
  personil: z.array(rabRowSchema).optional(),
  langsung: z.array(rabRowSchema).optional(),
});
export type UpdateRabTemplateInput = z.infer<typeof updateRabTemplateSchema>;
