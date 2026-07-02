import { delay } from "@/lib/data/_delay";
import { pengirimanConfigFixture } from "@/lib/fixtures/pengiriman-config";
import {
  pengirimanConfigSchema, emailAkunSchema,
  type PengirimanConfig, type EmailAkun, type EmailTemplate,
} from "@/lib/schemas/pengiriman-config";
import type { JenisDokumenKirim } from "@/lib/schemas/pengiriman";

export async function getPengirimanConfig(): Promise<PengirimanConfig> {
  await delay();
  return pengirimanConfigSchema.parse(pengirimanConfigFixture.current);
}

/** Simulated SMTP test — in a prototype this "succeeds" whenever every field is well-formed. */
export async function testEmailConnection(input: Omit<EmailAkun, "terkonfigurasi">): Promise<{ ok: boolean; message: string }> {
  await delay(600);
  const parsed = emailAkunSchema.omit({ terkonfigurasi: true }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "Koneksi email gagal — periksa kredensial." };
  return { ok: true, message: "Koneksi berhasil." };
}

export async function updateEmailAkun(input: Omit<EmailAkun, "terkonfigurasi">): Promise<PengirimanConfig> {
  await delay(400);
  const test = await testEmailConnection(input);
  if (!test.ok) throw new Error(test.message);
  pengirimanConfigFixture.current = {
    ...pengirimanConfigFixture.current,
    emailAkun: { ...input, terkonfigurasi: true },
  };
  return pengirimanConfigSchema.parse(pengirimanConfigFixture.current);
}

export async function updateEmailTemplate(jenis: JenisDokumenKirim, template: EmailTemplate): Promise<PengirimanConfig> {
  await delay(300);
  pengirimanConfigFixture.current = {
    ...pengirimanConfigFixture.current,
    emailTemplates: { ...pengirimanConfigFixture.current.emailTemplates, [jenis]: template },
  };
  return pengirimanConfigSchema.parse(pengirimanConfigFixture.current);
}
