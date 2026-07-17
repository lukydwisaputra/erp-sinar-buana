CREATE TABLE IF NOT EXISTS "signature_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"signature_image" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "use_digital_signature" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "signature_template_id" uuid;--> statement-breakpoint
ALTER TABLE "master_invoices" ADD COLUMN "use_digital_signature" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "master_invoices" ADD COLUMN "signature_template_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quotations" ADD CONSTRAINT "quotations_signature_template_id_signature_templates_id_fk" FOREIGN KEY ("signature_template_id") REFERENCES "public"."signature_templates"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "master_invoices" ADD CONSTRAINT "master_invoices_signature_template_id_signature_templates_id_fk" FOREIGN KEY ("signature_template_id") REFERENCES "public"."signature_templates"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
