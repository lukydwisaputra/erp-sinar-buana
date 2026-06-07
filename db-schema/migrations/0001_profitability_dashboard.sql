CREATE TYPE "public"."corp_tax_method" AS ENUM('final_0_5', 'badan_22');--> statement-breakpoint
CREATE TYPE "public"."expense_nature" AS ENUM('HPP', 'OPERASIONAL', 'NON_LABA_RUGI');--> statement-breakpoint
CREATE TYPE "public"."rab_category" AS ENUM('personil_a', 'langsung_b');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'project_over_budget';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'milestone_slipping';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'project_stalled';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'pph23_bukti_potong_missing';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dashboard_settings" (
	"singleton" boolean PRIMARY KEY DEFAULT true NOT NULL,
	"project_margin_threshold" numeric(9, 4) DEFAULT '0.8' NOT NULL,
	"forecast_horizon_days" integer DEFAULT 90 NOT NULL,
	"stalled_project_days" integer DEFAULT 30 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rab_actuals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"rab_category" "rab_category" NOT NULL,
	"amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"date" date NOT NULL,
	"note" text,
	"cashflow_entry_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid
);
--> statement-breakpoint
ALTER TABLE "cashflow_categories" ADD COLUMN "expense_nature" "expense_nature" DEFAULT 'OPERASIONAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "tax_settings" ADD COLUMN "corp_tax_method" "corp_tax_method" DEFAULT 'final_0_5' NOT NULL;--> statement-breakpoint
ALTER TABLE "tax_settings" ADD COLUMN "corp_tax_rate" numeric(9, 4) DEFAULT '0.5' NOT NULL;--> statement-breakpoint
ALTER TABLE "tax_settings" ADD COLUMN "umkm_threshold" numeric(18, 2) DEFAULT '4800000000' NOT NULL;--> statement-breakpoint
ALTER TABLE "cashflow_entries" ADD COLUMN "project_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rab_actuals" ADD CONSTRAINT "rab_actuals_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rab_actuals" ADD CONSTRAINT "rab_actuals_cashflow_entry_id_cashflow_entries_id_fk" FOREIGN KEY ("cashflow_entry_id") REFERENCES "public"."cashflow_entries"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cashflow_entries" ADD CONSTRAINT "cashflow_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
