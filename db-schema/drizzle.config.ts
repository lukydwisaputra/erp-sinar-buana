import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit configuration.
 *
 * Targets a self-hosted Supabase Postgres instance. The Drizzle-managed tables
 * live in the `public` schema; Supabase's own `auth` schema (auth.users) is NOT
 * managed here — we only reference it (see src/schema/auth.ts).
 *
 * RLS policies, triggers/functions and seed data are authored as plain SQL under
 * ./sql and are applied AFTER the Drizzle-generated migrations (see README).
 */
export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  // Only manage the public schema; never touch Supabase-internal schemas.
  schemaFilter: ["public"],
  verbose: true,
  strict: true,
});
