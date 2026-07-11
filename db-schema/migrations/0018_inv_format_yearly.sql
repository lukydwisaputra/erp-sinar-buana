ALTER TABLE "numbering_settings" ALTER COLUMN "inv_format" SET DEFAULT 'INV/{seq}/{year}';--> statement-breakpoint
-- Backfill: the singleton row (if it already exists, e.g. on a DB seeded
-- before this migration) still holds the old monthly-reset format. The
-- trigger now always pins v_month := 0 for master_invoices regardless of
-- format, so any stored value containing a {month} token would render as
-- a literal "0" (e.g. "INV/001/0.2026") instead of erroring — must be
-- overwritten, not left to the column DEFAULT which only applies on INSERT.
UPDATE "numbering_settings" SET "inv_format" = 'INV/{seq}/{year}' WHERE "inv_format" LIKE '%{month}%';