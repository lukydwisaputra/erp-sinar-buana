import { z } from "zod";

export const docTypePenomoran = z.enum(["sph", "inv", "proyek"]);
export type DocTypePenomoran = z.infer<typeof docTypePenomoran>;

export const formatNomorSchema = z.object({
  docType: docTypePenomoran,
  format: z.string().refine((s) => s.includes("{urut}"), "Format nomor harus memuat {urut}."), // VR-00.5
});
export type FormatNomor = z.infer<typeof formatNomorSchema>;

export const penomoranConfigSchema = z.object({
  formats: z.array(formatNomorSchema),
});
export type PenomoranConfig = z.infer<typeof penomoranConfigSchema>;
