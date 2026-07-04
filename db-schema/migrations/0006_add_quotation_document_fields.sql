ALTER TABLE "quotations" ADD COLUMN "opening_sentence" text;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "attachment_note" text;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "recipient_title" text;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "rincian_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "ppn_active" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "ppn_percent" numeric(9, 4);--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "pph23_active" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "pph23_percent" numeric(9, 4);--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "pic_override_active" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "pic_override_name" text;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "pic_override_position" text;