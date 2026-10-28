ALTER TABLE "game_combatants" ADD COLUMN "weapon_set" text;--> statement-breakpoint
ALTER TABLE "game_combatants" ADD COLUMN "set_switched" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "game_combatants" ADD COLUMN "hand_swapped" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "game_combatants" ADD COLUMN "light_attacked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "game_combatants" ADD COLUMN "pending_damage" jsonb;--> statement-breakpoint
ALTER TABLE "game_combatants" ADD CONSTRAINT "game_combatants_weapon_set" CHECK ("game_combatants"."weapon_set" in ('melee', 'ranged'));