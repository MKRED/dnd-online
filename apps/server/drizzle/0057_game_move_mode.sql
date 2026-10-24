ALTER TABLE "games" ADD COLUMN "move_mode" varchar(16) DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "combat_round" integer;