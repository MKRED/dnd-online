CREATE TABLE "game_events" (
	"game_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"kind" varchar(40) NOT NULL,
	"actor_id" uuid,
	"as_kind" varchar(20),
	"as_id" uuid,
	"scene_id" uuid,
	"intent" jsonb,
	"result" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_events_pk" PRIMARY KEY("game_id","seq")
);
--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "event_seq" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;