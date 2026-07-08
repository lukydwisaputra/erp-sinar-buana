import { z } from "zod";
import { jenisDokumenKirim } from "@/lib/schemas/pengiriman";

/** Read-only DTO — never carries the password, decrypted or otherwise. */
export const emailAkunSchema = z.object({
  host: z.string().nullable(),
  port: z.number().nullable(),
  username: z.string().nullable(),
  fromNama: z.string().nullable(),
  fromEmail: z.string().nullable(),
  /** Flips true only after a successful "test connection" + save (VR-00.7). */
  terkonfigurasi: z.boolean(),
});
export type EmailAkun = z.infer<typeof emailAkunSchema>;

/** Password required — the edit form always asks for it fresh; never prefilled from the server. */
export const updateEmailAkunInputSchema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().positive(),
  username: z.string().min(1),
  password: z.string().min(1),
  fromNama: z.string().min(1),
  fromEmail: z.string().email(),
});
export type UpdateEmailAkunInput = z.infer<typeof updateEmailAkunInputSchema>;

export const testEmailConnectionInputSchema = updateEmailAkunInputSchema;
export type TestEmailConnectionInput = z.infer<typeof testEmailConnectionInputSchema>;

export const messageTemplateSchema = z.object({
  subjek: z.string().nullable(), // email only; null for whatsapp
  body: z.string(),
});
export type MessageTemplateDto = z.infer<typeof messageTemplateSchema>;

export const updateTemplateInputSchema = z.object({
  jenis: jenisDokumenKirim,
  channel: z.enum(["email", "whatsapp"]),
  template: z.object({
    subjek: z.string().min(1, "Subjek wajib diisi.").optional(),
    body: z.string().min(1, "Isi pesan wajib diisi."),
  }),
});
export type UpdateTemplateInput = z.infer<typeof updateTemplateInputSchema>;

export const pengirimanConfigSchema = z.object({
  emailAkun: emailAkunSchema.nullable(),
  emailTemplates: z.record(jenisDokumenKirim, messageTemplateSchema),
  whatsappTemplates: z.record(jenisDokumenKirim, messageTemplateSchema),
});
export type PengirimanConfig = z.infer<typeof pengirimanConfigSchema>;
