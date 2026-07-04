import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { db, schema } from "./client";

export type Tx = Parameters<
  Parameters<PostgresJsDatabase<typeof schema>["transaction"]>[0]
>[0];

/**
 * RLS-via-app (docs/architecture.md §4): every request that touches user data
 * runs inside a transaction that adopts the caller's identity, exactly as
 * PostgREST would. `auth.uid()` resolves from `app.user_id` (the non-Supabase
 * stub) — RLS policies in db-schema/sql/rls/ are the real access-control layer,
 * this is not decorative.
 */
export async function withUserTransaction<T>(
  userId: string,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`set local role authenticated`);
    await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`);
    return fn(tx);
  });
}

/**
 * `service_role` bypasses RLS entirely. Reserved for explicitly marked paths
 * (architecture.md §4): auth itself (no session exists yet to adopt), and
 * admin user-management writes — `user_profiles` has no `authenticated`-role
 * write policy at all, by design, so account creation/role changes go through
 * here, gated by our own RBAC check (src/lib/auth/rbac.ts) rather than RLS.
 */
export async function withServiceRole<T>(
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`set local role service_role`);
    return fn(tx);
  });
}
