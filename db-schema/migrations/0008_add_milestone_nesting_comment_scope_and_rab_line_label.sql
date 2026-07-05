CREATE TABLE IF NOT EXISTS "milestone_assignees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"milestone_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "milestone_assignees_uq" UNIQUE("milestone_id","employee_id")
);
--> statement-breakpoint
ALTER TABLE "milestones" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "milestones" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "project_comments" ADD COLUMN "milestone_id" uuid;--> statement-breakpoint
ALTER TABLE "rab_actuals" ADD COLUMN "rab_line_label" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "milestone_assignees" ADD CONSTRAINT "milestone_assignees_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "milestone_assignees" ADD CONSTRAINT "milestone_assignees_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "milestones" ADD CONSTRAINT "milestones_parent_id_milestones_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."milestones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_comments" ADD CONSTRAINT "project_comments_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
