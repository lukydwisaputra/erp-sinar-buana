ALTER TYPE "public"."numbered_doc_type" ADD VALUE 'GAJ';--> statement-breakpoint
ALTER TABLE "numbering_settings" ADD COLUMN "gaj_format" text DEFAULT 'GAJ/{seq}/{month}.{year}' NOT NULL;--> statement-breakpoint
ALTER TABLE "payslips" ADD COLUMN "number_year" integer;--> statement-breakpoint
ALTER TABLE "payslips" ADD COLUMN "number_month" integer;--> statement-breakpoint
ALTER TABLE "payslips" ADD COLUMN "planned_pay_date" date;