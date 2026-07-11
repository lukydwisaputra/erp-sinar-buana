import { and, desc, eq } from "drizzle-orm";
import { withUserTransaction, withServiceRole } from "@/lib/db/tx";
import { schema } from "@/lib/db/client";
import { NotFoundError } from "@/lib/api-error";
import { toNotification } from "@/lib/notifications/mapping";
import type { Notification } from "@/lib/schemas/notifications";

const LIST_LIMIT = 50;

export async function listNotifications(userId: string): Promise<Notification[]> {
  return withUserTransaction(userId, async (tx) => {
    const rows = await tx
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.userId, userId))
      .orderBy(desc(schema.notifications.createdAt))
      .limit(LIST_LIMIT);
    return rows.map(toNotification);
  });
}

export async function markNotificationRead(userId: string, id: string): Promise<Notification> {
  return withUserTransaction(userId, async (tx) => {
    const [row] = await tx
      .update(schema.notifications)
      .set({ isRead: true, updatedAt: new Date() })
      .where(and(eq(schema.notifications.id, id), eq(schema.notifications.userId, userId)))
      .returning();
    if (!row) throw new NotFoundError("Notifikasi tidak ditemukan.");
    return toNotification(row);
  });
}

/** `notifications` has no INSERT policy for `authenticated` at all (only
 * self-scoped `notif_sel`/`notif_upd`) — by design, since a plain role grant
 * would let any user write a row claiming to be a notification for someone
 * else. Runs elevated instead, same as the mention-name lookups in
 * `proyek/service.ts`: the actor writing a comment is already authorized to
 * mention whoever they choose (no RBAC gate on who can be mentioned), this
 * just performs the resulting write. */
export async function createMentionNotifications(
  mentionedUserIds: string[],
  info: { actorName: string; milestoneName: string; commentBody: string; linkPath: string },
): Promise<void> {
  if (!mentionedUserIds.length) return;
  const snippet = info.commentBody.length > 140 ? `${info.commentBody.slice(0, 140)}…` : info.commentBody;
  await withServiceRole(async (tx) => {
    await tx.insert(schema.notifications).values(
      mentionedUserIds.map((userId) => ({
        userId,
        type: "mention" as const,
        title: `${info.actorName} menyebut Anda di "${info.milestoneName}"`,
        body: snippet,
        linkPath: info.linkPath,
      })),
    );
  });
}
