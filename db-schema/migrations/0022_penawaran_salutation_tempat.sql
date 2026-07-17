ALTER TABLE "company_contacts" ADD COLUMN "salutation" text DEFAULT 'bapak_ibu' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "recipient_salutation" text DEFAULT 'bapak_ibu' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "place" text;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "pic_override_salutation" text;