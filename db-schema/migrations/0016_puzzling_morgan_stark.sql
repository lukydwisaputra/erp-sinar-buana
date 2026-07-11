ALTER TYPE "public"."numbered_doc_type" ADD VALUE 'PRY';--> statement-breakpoint
ALTER TYPE "public"."numbered_doc_type" ADD VALUE 'PRS';--> statement-breakpoint
ALTER TYPE "public"."numbered_doc_type" ADD VALUE 'KLG';--> statement-breakpoint
ALTER TYPE "public"."numbered_doc_type" ADD VALUE 'FKI';--> statement-breakpoint
ALTER TABLE "numbering_settings" ADD COLUMN "pry_format" text DEFAULT 'PRY/{seq}' NOT NULL;--> statement-breakpoint
ALTER TABLE "numbering_settings" ADD COLUMN "prs_format" text DEFAULT 'PRS/{seq}' NOT NULL;--> statement-breakpoint
ALTER TABLE "numbering_settings" ADD COLUMN "klg_format" text DEFAULT 'KLG/{seq}' NOT NULL;--> statement-breakpoint
ALTER TABLE "numbering_settings" ADD COLUMN "fki_format" text DEFAULT 'FKI/{seq}' NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "number" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "number_year" integer;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "number_month" integer;--> statement-breakpoint
ALTER TABLE "kelengkapan_templates" ADD COLUMN "number" text;--> statement-breakpoint
ALTER TABLE "kelengkapan_templates" ADD COLUMN "number_year" integer;--> statement-breakpoint
ALTER TABLE "kelengkapan_templates" ADD COLUMN "number_month" integer;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "number" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "number_year" integer;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "number_month" integer;--> statement-breakpoint
ALTER TABLE "master_invoices" ADD COLUMN "number" text;--> statement-breakpoint
ALTER TABLE "master_invoices" ADD COLUMN "number_year" integer;--> statement-breakpoint
ALTER TABLE "master_invoices" ADD COLUMN "number_month" integer;