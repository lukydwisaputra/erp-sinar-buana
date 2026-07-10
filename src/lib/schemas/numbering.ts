import { z } from "zod";

/** The 3 real document types the numbering trigger
 * (`assign_document_number()`, db-schema/sql/triggers/10_numbering.sql)
 * actually generates numbers for. There is no "proyek" numbering — no
 * column or trigger branch exists for it. */
export const docTypeNumbering = z.enum(["sph", "inv", "gaj"]);
export type DocTypeNumbering = z.infer<typeof docTypeNumbering>;

const formatField = z.string().refine((s) => s.includes("{seq}"), "Format nomor harus memuat {seq}.");

export const numberingSettingsSchema = z.object({
  sphFormat: formatField,
  invFormat: formatField,
  gajFormat: formatField,
  seqPadding: z.number().int().min(1).max(10),
});
export type NumberingSettings = z.infer<typeof numberingSettingsSchema>;

export const updateNumberingSettingsSchema = numberingSettingsSchema;
export type UpdateNumberingSettingsInput = z.infer<typeof updateNumberingSettingsSchema>;
