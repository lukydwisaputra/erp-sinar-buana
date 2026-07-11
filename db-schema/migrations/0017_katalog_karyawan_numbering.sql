ALTER TYPE "public"."numbered_doc_type" ADD VALUE 'LYN';--> statement-breakpoint
ALTER TYPE "public"."numbered_doc_type" ADD VALUE 'KRY';--> statement-breakpoint
ALTER TABLE "numbering_settings" ADD COLUMN "lyn_format" text DEFAULT 'LYN/{seq}' NOT NULL;--> statement-breakpoint
ALTER TABLE "numbering_settings" ADD COLUMN "kry_format" text DEFAULT 'KRY/{seq}' NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "number" text;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "number_year" integer;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "number_month" integer;--> statement-breakpoint
ALTER TABLE "service_catalog" ADD COLUMN "number" text;--> statement-breakpoint
ALTER TABLE "service_catalog" ADD COLUMN "number_year" integer;--> statement-breakpoint
ALTER TABLE "service_catalog" ADD COLUMN "number_month" integer;