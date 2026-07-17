ALTER TYPE "public"."cashflow_category_system_key" ADD VALUE 'REFUND_PEMBATALAN';--> statement-breakpoint
ALTER TYPE "public"."cashflow_category_system_key" ADD VALUE 'ADMIN_PEMBATALAN';--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "cancel_reason" text;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "cancel_fee" numeric(18, 2);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "cancel_reason" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "cancel_fee" numeric(18, 2);--> statement-breakpoint
ALTER TABLE "installment_invoices" ADD COLUMN "is_cancellation_fee" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "master_invoices" ADD COLUMN "cancel_reason" text;--> statement-breakpoint
ALTER TABLE "master_invoices" ADD COLUMN "cancel_fee" numeric(18, 2);