import { DOC_TYPE_DB_TO_APP } from "@/lib/pengiriman/enum-map";
import type { JenisDokumenKirim } from "@/lib/schemas/pengiriman";
import type { EmailAkun, MessageTemplateDto } from "@/lib/schemas/pengiriman-config";

export type EmailAccountRow = {
  host: string | null;
  port: number | null;
  username: string | null;
  fromNama: string | null;
  fromEmail: string | null;
  isConfigured: boolean;
};

export type MessageTemplateRow = {
  channel: "email" | "whatsapp";
  documentType: "sph" | "invoice" | "slip_gaji";
  subject: string | null;
  body: string;
};

/** Never returns the password (decrypted or otherwise) — this DTO is client-facing. */
export function toEmailAkun(row: EmailAccountRow | undefined): EmailAkun | null {
  if (!row || !row.isConfigured) return null;
  return {
    host: row.host,
    port: row.port,
    username: row.username,
    fromNama: row.fromNama,
    fromEmail: row.fromEmail,
    terkonfigurasi: row.isConfigured,
  };
}

export function toTemplatesByChannel(
  rows: MessageTemplateRow[],
  channel: "email" | "whatsapp",
): Record<JenisDokumenKirim, MessageTemplateDto> {
  const result = {} as Record<JenisDokumenKirim, MessageTemplateDto>;
  for (const row of rows) {
    if (row.channel !== channel) continue;
    const jenis = DOC_TYPE_DB_TO_APP[row.documentType];
    result[jenis] = { subjek: row.subject, body: row.body };
  }
  return result;
}
