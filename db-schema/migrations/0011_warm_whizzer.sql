CREATE TYPE "public"."kelengkapan_item_status" AS ENUM('ada', 'tidak');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kelengkapan_template_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"persyaratan" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kelengkapan_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quotation_kelengkapan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_id" uuid NOT NULL,
	"template_id" uuid,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quotation_kelengkapan_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_kelengkapan_id" uuid NOT NULL,
	"persyaratan" text NOT NULL,
	"status" "kelengkapan_item_status",
	"keterangan" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kelengkapan_template_items" ADD CONSTRAINT "kelengkapan_template_items_template_id_kelengkapan_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."kelengkapan_templates"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quotation_kelengkapan" ADD CONSTRAINT "quotation_kelengkapan_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quotation_kelengkapan" ADD CONSTRAINT "quotation_kelengkapan_template_id_kelengkapan_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."kelengkapan_templates"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quotation_kelengkapan_items" ADD CONSTRAINT "quotation_kelengkapan_items_quotation_kelengkapan_id_quotation_kelengkapan_id_fk" FOREIGN KEY ("quotation_kelengkapan_id") REFERENCES "public"."quotation_kelengkapan"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
