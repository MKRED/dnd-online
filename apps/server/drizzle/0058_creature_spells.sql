ALTER TABLE "game_creatures" ADD COLUMN "spell_slots_expended" jsonb;--> statement-breakpoint
ALTER TABLE "game_creatures" ADD COLUMN "prepared" jsonb DEFAULT '{}'::jsonb NOT NULL;