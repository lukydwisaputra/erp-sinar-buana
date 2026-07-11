import { z } from "zod";

/** The document/record types the numbering trigger
 * (`assign_document_number()`, db-schema/sql/triggers/10_numbering.sql)
 * generates numbers for. sph/inv/gaj reset monthly ({seq}/{month}.{year});
 * pry/prs/klg/fki/lyn/kry are one-off record-creation events (project,
 * company, checklist template, invoice contract, service catalog entry,
 * employee) and never reset — plain {seq}. */
export const docTypeNumbering = z.enum(["sph", "inv", "gaj", "pry", "prs", "klg", "fki", "lyn", "kry"]);
export type DocTypeNumbering = z.infer<typeof docTypeNumbering>;

const formatField = z.string().refine((s) => s.includes("{seq}"), "Format nomor harus memuat {seq}.");

export const numberingSettingsSchema = z.object({
  sphFormat: formatField,
  invFormat: formatField,
  gajFormat: formatField,
  pryFormat: formatField,
  prsFormat: formatField,
  klgFormat: formatField,
  fkiFormat: formatField,
  lynFormat: formatField,
  kryFormat: formatField,
  seqPadding: z.number().int().min(1).max(10),
});
export type NumberingSettings = z.infer<typeof numberingSettingsSchema>;

export const updateNumberingSettingsSchema = numberingSettingsSchema;
export type UpdateNumberingSettingsInput = z.infer<typeof updateNumberingSettingsSchema>;
