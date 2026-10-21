CREATE TABLE "game_creature_effects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scene_id" uuid NOT NULL,
	"object_id" integer NOT NULL,
	"effect_id" uuid NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_creature_effects_once" UNIQUE("scene_id","object_id","effect_id")
);
--> statement-breakpoint
CREATE TABLE "game_creatures" (
	"scene_id" uuid NOT NULL,
	"object_id" integer NOT NULL,
	"hit_points_current" integer NOT NULL,
	"hit_points_temp" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "game_creatures_scene_id_object_id_pk" PRIMARY KEY("scene_id","object_id")
);
--> statement-breakpoint
ALTER TABLE "game_creature_effects" ADD CONSTRAINT "game_creature_effects_scene_id_game_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."game_scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_creatures" ADD CONSTRAINT "game_creatures_scene_id_game_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."game_scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_creature_effects_scene_idx" ON "game_creature_effects" USING btree ("scene_id");