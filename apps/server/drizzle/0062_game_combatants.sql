CREATE TABLE "game_combatants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"scene_id" uuid NOT NULL,
	"character_id" uuid,
	"object_id" integer,
	"surprised" boolean DEFAULT false NOT NULL,
	"initiative" integer,
	"modifier" integer,
	"roll" jsonb,
	"place" integer,
	"joined_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT "game_combatants_figure" UNIQUE("scene_id","character_id"),
	CONSTRAINT "game_combatants_creature" UNIQUE("scene_id","object_id"),
	CONSTRAINT "game_combatants_ref" CHECK (("game_combatants"."character_id" is null) <> ("game_combatants"."object_id" is null))
);
--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "combat_turn" uuid;--> statement-breakpoint
ALTER TABLE "game_combatants" ADD CONSTRAINT "game_combatants_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_combatants" ADD CONSTRAINT "game_combatants_scene_id_game_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."game_scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_combatants" ADD CONSTRAINT "game_combatants_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_combatants_game_idx" ON "game_combatants" USING btree ("game_id");