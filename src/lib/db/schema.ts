/**
 * Local mirror of the tables the Next app queries directly, sourced from
 * `db-schema/src/schema/auth.ts`.
 *
 * `db-schema/` is the source of truth for DDL (migrations, RLS, triggers) and
 * is deliberately its own standalone package (own package.json/lockfile), not
 * an npm workspace member — importing its Drizzle table objects directly here
 * would pull in a second, differently-resolved copy of `drizzle-orm` and the
 * generic column types don't unify across the two module instances. Rather
 * than merging the repo into a workspace, this file re-declares just the
 * handful of tables the Next app actually queries. Keep column names/types in
 * sync with `db-schema/src/schema/*.ts` by hand; the SQL migrations there
 * remain authoritative.
 */
import {
  boolean,
  pgEnum,
  pgSchema,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Non-Supabase auth stub (infra/postgres/init/00-roles.sql) — id + email only.
// Query-only here: Drizzle never migrates/owns this schema (db-schema/src/schema/auth.ts).
const authSchema = pgSchema("auth");
export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
  email: text("email").unique(),
});

export const appRole = pgEnum("app_role", [
  "admin",
  "keuangan",
  "sales",
  "tim_teknis",
  "viewer",
]);

export const authTokenType = pgEnum("auth_token_type", ["invite", "reset"]);

const pk = () => uuid("id").primaryKey().default(sql`gen_random_uuid()`);
const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey(),
  fullName: text("full_name").notNull(),
  passwordHash: text("password_hash"),
  role: appRole("role").notNull().default("viewer"),
  employeeId: uuid("employee_id").unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: pk(),
  userId: uuid("user_id")
    .notNull()
    .references(() => userProfiles.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
});

export const authTokens = pgTable("auth_tokens", {
  id: pk(),
  userId: uuid("user_id")
    .notNull()
    .references(() => userProfiles.id, { onDelete: "cascade" }),
  type: authTokenType("type").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: createdAt(),
});
