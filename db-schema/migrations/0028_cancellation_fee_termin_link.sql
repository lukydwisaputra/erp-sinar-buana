ALTER TABLE "installment_invoices" ADD COLUMN "referenced_installment_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "installment_invoices" ADD CONSTRAINT "installment_invoices_referenced_installment_id_installment_invoices_id_fk" FOREIGN KEY ("referenced_installment_id") REFERENCES "public"."installment_invoices"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
