import { z } from "zod";

/** Digital signature templates (Konfigurasi > Template > Tanda Tangan) —
 * picked per-document at SPH/Faktur creation time, not globally active like
 * PDF templates. `signatureImage` is a data URI PNG exported by the
 * draw-signature canvas (src/components/shared/signature-pad.tsx). */
export const signatureTemplateSchema = z.object({
  id: z.string(), // uuid (signature_templates.id)
  nama: z.string(),
  signatureImage: z.string(),
});
export type SignatureTemplate = z.infer<typeof signatureTemplateSchema>;

/** API input schema — server-side validation for POST/PATCH /api/signature-templates. */
export const createSignatureTemplateSchema = z.object({
  nama: z.string().min(1, "Nama wajib diisi."),
  signatureImage: z.string().min(1, "Tanda tangan wajib digambar."),
});
export type CreateSignatureTemplateInput = z.infer<typeof createSignatureTemplateSchema>;

export const updateSignatureTemplateSchema = z.object({
  nama: z.string().min(1).optional(),
  signatureImage: z.string().min(1).optional(),
});
export type UpdateSignatureTemplateInput = z.infer<typeof updateSignatureTemplateSchema>;
