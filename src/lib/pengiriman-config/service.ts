import { and, eq } from "drizzle-orm";
import nodemailer from "nodemailer";
import { withUserTransaction } from "@/lib/db/tx";
import { schema } from "@/lib/db/client";
import { ConflictError, NotFoundError } from "@/lib/api-error";
import { encryptSecret } from "@/lib/crypto";
import { DOC_TYPE_APP_TO_DB } from "@/lib/pengiriman/enum-map";
import {
  toEmailAkun,
  toTemplatesByChannel,
  type EmailAccountRow,
  type MessageTemplateRow,
} from "@/lib/pengiriman-config/mapping";
import type {
  PengirimanConfig,
  EmailAkun,
  UpdateEmailAkunInput,
  TestEmailConnectionInput,
  UpdateTemplateInput,
  MessageTemplateDto,
} from "@/lib/schemas/pengiriman-config";

function buildTransport(input: { host: string; port: number; username: string; password: string }) {
  return nodemailer.createTransport({
    host: input.host,
    port: input.port,
    secure: input.port === 465,
    auth: { user: input.username, pass: input.password },
  });
}

export async function getConfig(userId: string): Promise<PengirimanConfig> {
  return withUserTransaction(userId, async (tx) => {
    const [account] = await tx.select().from(schema.emailAccounts).limit(1);
    const templates = await tx.select().from(schema.messageTemplates);
    return {
      emailAkun: toEmailAkun(account as EmailAccountRow | undefined),
      emailTemplates: toTemplatesByChannel(templates as MessageTemplateRow[], "email"),
      whatsappTemplates: toTemplatesByChannel(templates as MessageTemplateRow[], "whatsapp"),
    };
  });
}

/** Stateless — a real SMTP handshake (no send), never persists anything. */
export async function testEmailConnection(
  input: TestEmailConnectionInput,
): Promise<{ ok: boolean; message: string }> {
  try {
    await buildTransport(input).verify();
    return { ok: true, message: "Koneksi SMTP berhasil." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Koneksi SMTP gagal." };
  }
}

/** Re-verifies server-side before persisting — never trusts a client-reported "already tested" flag. */
export async function updateEmailAkun(
  userId: string,
  input: UpdateEmailAkunInput,
): Promise<EmailAkun | null> {
  try {
    await buildTransport(input).verify();
  } catch (err) {
    throw new ConflictError(
      `Uji koneksi gagal, perubahan tidak disimpan: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  return withUserTransaction(userId, async (tx) => {
    const [row] = await tx
      .update(schema.emailAccounts)
      .set({
        host: input.host,
        port: input.port,
        username: input.username,
        passwordEncrypted: encryptSecret(input.password),
        fromNama: input.fromNama,
        fromEmail: input.fromEmail,
        isConfigured: true,
      })
      .where(eq(schema.emailAccounts.singleton, true))
      .returning();
    return toEmailAkun(row as EmailAccountRow);
  });
}

export async function updateTemplate(
  userId: string,
  input: UpdateTemplateInput,
): Promise<MessageTemplateDto> {
  return withUserTransaction(userId, async (tx) => {
    const dbDocType = DOC_TYPE_APP_TO_DB[input.jenis];
    const [row] = await tx
      .update(schema.messageTemplates)
      .set({
        subject: input.channel === "email" ? (input.template.subjek ?? null) : null,
        body: input.template.body,
      })
      .where(
        and(
          eq(schema.messageTemplates.channel, input.channel),
          eq(schema.messageTemplates.documentType, dbDocType),
        ),
      )
      .returning();
    if (!row) throw new NotFoundError("Template tidak ditemukan.");
    return { subjek: row.subject, body: row.body };
  });
}
