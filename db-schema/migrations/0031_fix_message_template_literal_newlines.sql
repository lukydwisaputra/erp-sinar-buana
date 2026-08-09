-- Backfill: db-schema/sql/seed/00_seed.sql originally inserted the email
-- message_templates rows (sph/invoice/slip_gaji) as plain '...' string
-- literals containing "\n". With standard_conforming_strings on (Postgres
-- default), backslash escapes are NOT interpreted inside '...' literals, so
-- those rows store the two literal characters backslash+n instead of a real
-- newline — every sent email showed a literal "\n\n" instead of a line
-- break. The seed file now uses E'...' so fresh installs seed correctly;
-- this backfill fixes rows already inserted by the old seed (any
-- environment that ran it before this migration, including this one).
UPDATE "message_templates" SET "body" = replace("body", '\n', E'\n') WHERE strpos("body", '\n') > 0;--> statement-breakpoint
UPDATE "message_templates" SET "subject" = replace("subject", '\n', E'\n') WHERE "subject" IS NOT NULL AND strpos("subject", '\n') > 0;
