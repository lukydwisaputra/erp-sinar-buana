ALTER TABLE "companies" ALTER COLUMN "npwp" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "province" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ALTER COLUMN "province" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "companies" DROP COLUMN IF EXISTS "regency";