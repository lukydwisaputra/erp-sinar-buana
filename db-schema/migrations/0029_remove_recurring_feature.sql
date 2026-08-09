ALTER TABLE "projects" DROP CONSTRAINT "projects_recurring_uq";--> statement-breakpoint
ALTER TABLE "service_catalog" DROP COLUMN IF EXISTS "is_recurring";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN IF EXISTS "recurring_period";