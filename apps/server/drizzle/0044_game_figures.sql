CREATE TABLE "game_figures" (
	"character_id" uuid PRIMARY KEY NOT NULL,
	"game_id" uuid NOT NULL,
	"scene_id" uuid NOT NULL,
	"x" integer NOT NULL,
	"y" integer NOT NULL,
	"z" integer NOT NULL,
	"facing" integer NOT NULL,
	"moved" integer DEFAULT 0 NOT NULL,
	"dashes" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_figures" ADD CONSTRAINT "game_figures_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_figures" ADD CONSTRAINT "game_figures_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_figures" ADD CONSTRAINT "game_figures_scene_id_game_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."game_scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_figures_game_idx" ON "game_figures" USING btree ("game_id");