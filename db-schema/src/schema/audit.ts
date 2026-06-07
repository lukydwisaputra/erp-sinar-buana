/**
 * Audit log (PRD Bab 13).
 *
 * Generic change journal written by triggers on the sensitive tables (invoices,
 * payslips, project status, configuration). Soft deletes are recorded as `delete`
 * with a later `restore`; permanent removal is `hard_delete`.
 */
import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { auditAction } from "./enums";
import { userProfiles } from "./auth";

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tableName: text("table_name").notNull(),
  recordId: uuid("record_id"),
  action: auditAction("action").notNull(),
  actorId: uuid("actor_id").references(() => userProfiles.id, {
    onDelete: "set null",
  }),
  // Old/new column values (or a diff). JSONB for flexible, queryable history.
  oldData: jsonb("old_data"),
  newData: jsonb("new_data"),
  changedAt: timestamp("changed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
