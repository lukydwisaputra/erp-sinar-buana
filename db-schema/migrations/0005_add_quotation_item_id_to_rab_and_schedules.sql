ALTER TABLE "quotation_rab_direct_costs" ADD COLUMN "quotation_item_id" uuid;--> statement-breakpoint
ALTER TABLE "quotation_rab_personnel" ADD COLUMN "quotation_item_id" uuid;--> statement-breakpoint
ALTER TABLE "activity_schedules" ADD COLUMN "quotation_item_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quotation_rab_direct_costs" ADD CONSTRAINT "quotation_rab_direct_costs_quotation_item_id_quotation_items_id_fk" FOREIGN KEY ("quotation_item_id") REFERENCES "public"."quotation_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quotation_rab_personnel" ADD CONSTRAINT "quotation_rab_personnel_quotation_item_id_quotation_items_id_fk" FOREIGN KEY ("quotation_item_id") REFERENCES "public"."quotation_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "activity_schedules" ADD CONSTRAINT "activity_schedules_quotation_item_id_quotation_items_id_fk" FOREIGN KEY ("quotation_item_id") REFERENCES "public"."quotation_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
