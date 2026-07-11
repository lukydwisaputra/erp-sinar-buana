import type { notifications } from "@/lib/db/schema";
import type { Notification } from "@/lib/schemas/notifications";

export type NotificationRow = typeof notifications.$inferSelect;

export function toNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    linkPath: row.linkPath,
    isRead: row.isRead,
    createdAt: row.createdAt.toISOString(),
  };
}
