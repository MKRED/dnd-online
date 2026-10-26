ALTER TABLE "characters" ADD COLUMN "action_count" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "bonus_action_count" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "reaction_count" integer DEFAULT 1 NOT NULL;