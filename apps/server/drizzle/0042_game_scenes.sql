CREATE TABLE "game_scene_chunks" (
	"scene_id" uuid NOT NULL,
	"cx" integer NOT NULL,
	"cy" integer NOT NULL,
	"cz" integer NOT NULL,
	"data" "bytea" NOT NULL,
	CONSTRAINT "game_scene_chunks_scene_id_cx_cy_cz_pk" PRIMARY KEY("scene_id","cx","cy","cz")
);
--> statement-breakpoint
CREATE TABLE "game_scene_objects" (
	"scene_id" uuid NOT NULL,
	"id" integer NOT NULL,
	"kind" varchar(20) NOT NULL,
	"x" integer NOT NULL,
	"y" integer NOT NULL,
	"z" integer NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"fields" jsonb NOT NULL,
	CONSTRAINT "game_scene_objects_scene_id_id_pk" PRIMARY KEY("scene_id","id")
);
--> statement-breakpoint
CREATE TABLE "game_scenes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"map_id" uuid,
	"name" varchar(100) NOT NULL,
	"palette" jsonb NOT NULL,
	"width" integer NOT NULL,
	"depth" integer NOT NULL,
	"seq" integer DEFAULT 0 NOT NULL,
	"next_object_id" integer NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "game_library" DROP CONSTRAINT "game_library_kind";--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "scene_open" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "game_scene_chunks" ADD CONSTRAINT "game_scene_chunks_scene_id_game_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."game_scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_scene_objects" ADD CONSTRAINT "game_scene_objects_scene_id_game_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."game_scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_scenes" ADD CONSTRAINT "game_scenes_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_scenes" ADD CONSTRAINT "game_scenes_map_id_maps_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."maps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_scenes_game_idx" ON "game_scenes" USING btree ("game_id");--> statement-breakpoint
CREATE UNIQUE INDEX "game_scenes_active_idx" ON "game_scenes" USING btree ("game_id") WHERE "game_scenes"."active";--> statement-breakpoint
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_scene_id_game_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."game_scenes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_library" ADD CONSTRAINT "game_library_kind" CHECK ("game_library"."kind" in ('monster', 'npc', 'item', 'ability', 'effect'));