import { z } from "zod";
import { jenisDokumenKirim } from "@/lib/schemas/pengiriman";

export const emailAkunSchema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().positive(),
  username: z.string().min(1),
  password: z.string().min(1),
  fromNama: z.string().min(1),
  fromEmail: z.string().email(),
  /** Flips true only after a successful "test connection" (VR-00.7). */
  terkonfigurasi: z.boolean(),
});
export type EmailAkun = z.infer<typeof emailAkunSchema>;

export const emailTemplateSchema = z.object({
  subjek: z.string().min(1, "Subjek wajib diisi."),
  body: z.string().min(1, "Isi email wajib diisi."),
});
export type EmailTemplate = z.infer<typeof emailTemplateSchema>;

export const pengirimanConfigSchema = z.object({
  emailAkun: emailAkunSchema.nullable(),
  emailTemplates: z.record(jenisDokumenKirim, emailTemplateSchema),
});
export type PengirimanConfig = z.infer<typeof pengirimanConfigSchema>;
