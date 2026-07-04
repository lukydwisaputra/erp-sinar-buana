/**
 * Identity & RBAC.
 *
 * Self-built auth (docs/architecture.md §5, not Supabase — Supabase was
 * dropped entirely per §1). `auth.users` is a minimal non-Supabase stub
 * (id + email only — see infra/postgres/init/00-roles.sql) that exists so
 * `auth.uid()` and RLS keep working the same way a Supabase deployment would;
 * we deliberately do NOT let Drizzle manage that schema/table. `user_profiles`
 * is the application-level "Akun Pengguna" (PRD Bab 2.4): a 1:1 extension of
 * auth.users holding the RBAC role, the employee link, status, and — since
 * nothing else owns it — the password hash.
 *
 * The FK `user_profiles.id -> auth.users(id)` is added in sql/00_auth_link.sql
 * (after the Drizzle migration) so Drizzle never tries to create/own the
 * `auth` schema. `id` therefore equals the auth.users id, letting RLS use
 * auth.uid() directly.
 */
import {
  boolean,
  foreignKey,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { appRole } from "./enums";
import { pk, timestamps } from "./_shared";
import { employees } from "./master-data";

export const userProfiles = pgTable(
  "user_profiles",
  {
    // = auth.users.id (FK declared in sql/00_auth_link.sql).
    id: uuid("id").primaryKey(),
    fullName: text("full_name").notNull(),
    // argon2id (docs/architecture.md §5). NULL until the invite is accepted
    // (US-01.2) — the account can't log in yet, only be invited/reset.
    passwordHash: text("password_hash"),
    role: appRole("role").notNull().default("viewer"),
    // 1:1 with an employee — required for "see own payslip" and to be a project
    // assignee (PRD Bab 2.4).
    employeeId: uuid("employee_id").unique(),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => ({
    employeeFk: foreignKey({
      columns: [t.employeeId],
      foreignColumns: [employees.id],
      name: "user_profiles_employee_id_fk",
    }).onDelete("set null"),
  }),
);

/**
 * Session — a revocable, cookie-backed login. `tokenHash` is the sha256 of
 * the opaque token that lives in the browser cookie; the raw token is never
 * stored. Deleting a user's rows here logs every one of their sessions out
 * (used on account deactivation, FR-01.6/01.9).
 */
export const sessions = pgTable("sessions", {
  id: pk(),
  userId: uuid("user_id")
    .notNull()
    .references(() => userProfiles.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamps.createdAt,
});

/** Invite (account activation) vs. password-reset tokens — PRD Bab 2.4 / EP-01. */
export const authTokenType = pgEnum("auth_token_type", ["invite", "reset"]);

/**
 * Single-use, expiring tokens for account activation and password reset
 * (EP-01 US-01.2/US-01.4). `tokenHash` mirrors the `sessions` pattern — only
 * the hash is stored. `usedAt` NULL = still redeemable.
 */
export const authTokens = pgTable("auth_tokens", {
  id: pk(),
  userId: uuid("user_id")
    .notNull()
    .references(() => userProfiles.id, { onDelete: "cascade" }),
  type: authTokenType("type").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamps.createdAt,
});
