ALTER TABLE "game_combatants" ADD COLUMN "actions_used" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "game_combatants" ADD COLUMN "bonus_actions_used" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "game_combatants" ADD COLUMN "reactions_used" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "game_combatants" ADD COLUMN "dodging" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "game_combatants" ADD COLUMN "disengaged" boolean DEFAULT false NOT NULL;