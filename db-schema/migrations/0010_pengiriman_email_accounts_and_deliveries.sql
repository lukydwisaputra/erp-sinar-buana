CREATE TYPE "public"."document_delivery_status" AS ENUM('queued', 'sent', 'failed');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_accounts" (
	"singleton" boolean PRIMARY KEY DEFAULT true NOT NULL,
	"host" text,
	"port" integer,
	"username" text,
	"password_encrypted" text,
	"from_nama" text,
	"from_email" text,
	"is_configured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "document_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel" "message_channel" NOT NULL,
	"document_type" "business_document_type" NOT NULL,
	"quotation_id" uuid,
	"installment_invoice_id" uuid,
	"payslip_id" uuid,
	"document_number" text NOT NULL,
	"recipient_name" text NOT NULL,
	"recipient_contact" text NOT NULL,
	"status" "document_delivery_status" DEFAULT 'queued' NOT NULL,
	"error" text,
	"sent_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_deliveries_exactly_one_owner_chk" CHECK (num_nonnulls("document_deliveries"."quotation_id", "document_deliveries"."installment_invoice_id", "document_deliveries"."payslip_id") = 1)
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_deliveries" ADD CONSTRAINT "document_deliveries_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_deliveries" ADD CONSTRAINT "document_deliveries_installment_invoice_id_installment_invoices_id_fk" FOREIGN KEY ("installment_invoice_id") REFERENCES "public"."installment_invoices"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_deliveries" ADD CONSTRAINT "document_deliveries_payslip_id_payslips_id_fk" FOREIGN KEY ("payslip_id") REFERENCES "public"."payslips"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_deliveries" ADD CONSTRAINT "document_deliveries_created_by_user_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user_profiles"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
