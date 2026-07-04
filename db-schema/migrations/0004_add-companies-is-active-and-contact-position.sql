ALTER TABLE "companies" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "company_contacts" ADD COLUMN "position" text;