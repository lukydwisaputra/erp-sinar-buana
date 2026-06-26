import { z } from "zod";

export const kelengkapanItemSchema = z.object({
  persyaratan: z.string(),
});

export const kelengkapanTemplateSchema = z.object({
  id: z.string(),
  nama: z.string(),
  items: z.array(kelengkapanItemSchema),
});

export type KelengkapanItem = z.infer<typeof kelengkapanItemSchema>;
export type KelengkapanTemplate = z.infer<typeof kelengkapanTemplateSchema>;
