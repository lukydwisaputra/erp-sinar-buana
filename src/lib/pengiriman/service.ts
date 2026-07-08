import { desc } from "drizzle-orm";
import { withUserTransaction } from "@/lib/db/tx";
import { schema } from "@/lib/db/client";
import { getBoss, DELIVERY_EMAIL_QUEUE } from "@/lib/queue/boss";
import type { EmailDeliveryJob } from "@/lib/queue/jobs";
import { toPengirimanLog, ownerFields, toDbDocType, type DeliveryRow } from "@/lib/pengiriman/mapping";
import type { CreateDeliveryInput, PengirimanLog } from "@/lib/schemas/pengiriman";

export async function listDeliveries(userId: string): Promise<PengirimanLog[]> {
  return withUserTransaction(userId, async (tx) => {
    const rows = await tx
      .select()
      .from(schema.documentDeliveries)
      .orderBy(desc(schema.documentDeliveries.createdAt));
    return rows.map((r) => toPengirimanLog(r as DeliveryRow));
  });
}

/** WhatsApp send already happened client-side (window.open) — this is purely a real log write, no queue involved. */
export async function createWhatsappDelivery(
  userId: string,
  input: CreateDeliveryInput,
): Promise<PengirimanLog> {
  return withUserTransaction(userId, async (tx) => {
    const [row] = await tx
      .insert(schema.documentDeliveries)
      .values({
        channel: "whatsapp",
        documentType: toDbDocType(input.jenisDokumen),
        ...ownerFields(input.jenisDokumen, input.dokumenId),
        documentNumber: input.dokumenNomor,
        recipientName: input.tujuanNama,
        recipientContact: input.tujuanKontak,
        status: "sent",
        sentAt: new Date(),
        createdBy: userId,
      })
      .returning();
    return toPengirimanLog(row as DeliveryRow);
  });
}

/**
 * Inserts a "queued" row, then enqueues the pg-boss job immediately after the
 * transaction commits ("outbox-lite" — pg-boss doesn't cleanly support
 * enqueueing inside an external Drizzle transaction; see docs/architecture.md).
 */
export async function createEmailDelivery(
  userId: string,
  input: CreateDeliveryInput,
): Promise<PengirimanLog> {
  const row = await withUserTransaction(userId, async (tx) => {
    const [inserted] = await tx
      .insert(schema.documentDeliveries)
      .values({
        channel: "email",
        documentType: toDbDocType(input.jenisDokumen),
        ...ownerFields(input.jenisDokumen, input.dokumenId),
        documentNumber: input.dokumenNomor,
        recipientName: input.tujuanNama,
        recipientContact: input.tujuanKontak,
        status: "queued",
        createdBy: userId,
      })
      .returning();
    return inserted;
  });

  const boss = await getBoss();
  await boss.send(DELIVERY_EMAIL_QUEUE, { deliveryId: row.id } satisfies EmailDeliveryJob, {
    retryLimit: 3,
    retryBackoff: true,
    expireInSeconds: 60,
  });

  return toPengirimanLog(row as DeliveryRow);
}
