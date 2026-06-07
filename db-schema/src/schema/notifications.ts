/**
 * Notifikasi & pengingat (PRD Bab 13 / 8 / 10.6).
 *
 * In-app + email notifications: tax due (H-3), invoice due/overdue, @mentions,
 * recurring Laporan Semester reminders, and milestone-triggered termin
 * suggestions. `linkPath` is an in-app route to the source. `scheduledFor`
 * supports pre-due reminders; `sentEmailAt` tracks email dispatch.
 */
import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { pk, timestamps } from "./_shared";
import { notificationType } from "./enums";
import { userProfiles } from "./auth";

export const notifications = pgTable("notifications", {
  id: pk(),
  userId: uuid("user_id")
    .notNull()
    .references(() => userProfiles.id, { onDelete: "cascade" }),
  type: notificationType("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  linkPath: text("link_path"),
  isRead: boolean("is_read").notNull().default(false),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  sentEmailAt: timestamp("sent_email_at", { withTimezone: true }),
  ...timestamps,
});
