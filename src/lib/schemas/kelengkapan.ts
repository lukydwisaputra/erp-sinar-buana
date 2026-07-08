import { z } from "zod";

export const kelengkapanItemSchema = z.object({
  persyaratan: z.string(),
});

export const kelengkapanTemplateSchema = z.object({
  id: z.string(), // uuid (kelengkapan_templates.id) — no cosmetic KLG-xxxxx code anymore
  nama: z.string(),
  items: z.array(kelengkapanItemSchema),
});

export type KelengkapanItem = z.infer<typeof kelengkapanItemSchema>;
export type KelengkapanTemplate = z.infer<typeof kelengkapanTemplateSchema>;

/** API input schema — server-side validation for POST/PATCH /api/kelengkapan. */
export const createKelengkapanSchema = z.object({
  nama: z.string().min(1, "Nama template wajib diisi."),
  items: z.array(kelengkapanItemSchema).min(1, "Tambahkan minimal satu persyaratan."),
});
export type CreateKelengkapanInput = z.infer<typeof createKelengkapanSchema>;

export const updateKelengkapanSchema = z.object({
  nama: z.string().min(1).optional(),
  items: z.array(kelengkapanItemSchema).min(1).optional(),
});
export type UpdateKelengkapanInput = z.infer<typeof updateKelengkapanSchema>;
