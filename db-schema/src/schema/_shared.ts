/**
 * Shared column helpers and domain types reused across every module.
 *
 * Conventions (see db-schema/README.md):
 *  - Primary keys are uuid (gen_random_uuid()).
 *  - Money is numeric(18,2) — IDR carries .00; intermediates keep full precision.
 *  - Every business table carries audit columns + soft-delete columns.
 *  - `updated_at` is maintained by the set_updated_at() trigger (sql/triggers).
 */
import { sql } from "drizzle-orm";
import { numeric, timestamp, uuid } from "drizzle-orm/pg-core";

/** Money column factory — IDR amounts. numeric(18,2), defaults to 0. */
export const money = (name: string) =>
  numeric(name, { precision: 18, scale: 2 });

/** Rate/percentage/multiplier column factory — e.g. 0.8000, 12.0000, 2.0000. */
export const rate = (name: string) =>
  numeric(name, { precision: 9, scale: 4 });

/** Primary key column shared by all tables. */
export const pk = () => uuid("id").primaryKey().default(sql`gen_random_uuid()`);

/**
 * created_at / updated_at present on every table.
 * Spread into a pgTable column object: `...timestamps`.
 */
export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

/**
 * Audit + soft-delete columns for business tables.
 * `createdBy` / `updatedBy` / `deletedBy` reference public.user_profiles(id),
 * declared as plain uuids here to avoid circular imports; the FK relationship is
 * documented and (optionally) enforced via SQL. NULL deletedAt = live row.
 */
export const audited = {
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedBy: uuid("deleted_by"),
};

/** Full set of bookkeeping columns: timestamps + audit + soft delete. */
export const bookkeeping = {
  ...timestamps,
  ...audited,
};
