CREATE TABLE "game_library" (
	"game_id" uuid NOT NULL,
	"kind" varchar(10) NOT NULL,
	"source_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"author_nickname" varchar(64) NOT NULL,
	"record" jsonb NOT NULL,
	"links" jsonb NOT NULL,
	"image" jsonb,
	"source_updated_at" timestamp with time zone NOT NULL,
	"copied_at" timestamp with time zone DEFAULT now() NOT NULL,
	"refreshed_at" timestamp with time zone,
	CONSTRAINT "game_library_game_id_kind_source_id_pk" PRIMARY KEY("game_id","kind","source_id"),
	CONSTRAINT "game_library_kind" CHECK ("game_library"."kind" in ('monster', 'item', 'ability', 'effect'))
);
--> statement-breakpoint
CREATE TABLE "game_library_image_files" (
	"game_id" uuid NOT NULL,
	"kind" varchar(10) NOT NULL,
	"source_id" uuid NOT NULL,
	"variant" varchar(10) NOT NULL,
	"data" "bytea" NOT NULL,
	CONSTRAINT "game_library_image_files_game_id_kind_source_id_variant_pk" PRIMARY KEY("game_id","kind","source_id","variant")
);
--> statement-breakpoint
ALTER TABLE "game_library" ADD CONSTRAINT "game_library_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_library_image_files" ADD CONSTRAINT "game_library_image_files_entry_fk" FOREIGN KEY ("game_id","kind","source_id") REFERENCES "public"."game_library"("game_id","kind","source_id") ON DELETE cascade ON UPDATE no action;