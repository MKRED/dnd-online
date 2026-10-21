CREATE TABLE "game_scene_fog" (
	"scene_id" uuid NOT NULL,
	"cx" integer NOT NULL,
	"cy" integer NOT NULL,
	"cz" integer NOT NULL,
	"explored" "bytea" NOT NULL,
	"visible" "bytea" NOT NULL,
	CONSTRAINT "game_scene_fog_scene_id_cx_cy_cz_pk" PRIMARY KEY("scene_id","cx","cy","cz")
);
--> statement-breakpoint
ALTER TABLE "game_scenes" ADD COLUMN "fog" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "game_scenes" ADD COLUMN "sight_range" integer DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE "game_scene_fog" ADD CONSTRAINT "game_scene_fog_scene_id_game_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."game_scenes"("id") ON DELETE cascade ON UPDATE no action;