CREATE TABLE "game_library_model_files" (
	"game_id" uuid NOT NULL,
	"kind" varchar(10) NOT NULL,
	"source_id" uuid NOT NULL,
	"data" "bytea" NOT NULL,
	CONSTRAINT "game_library_model_files_game_id_kind_source_id_pk" PRIMARY KEY("game_id","kind","source_id")
);
--> statement-breakpoint
ALTER TABLE "game_library" ADD COLUMN "model" jsonb;--> statement-breakpoint
ALTER TABLE "game_library_model_files" ADD CONSTRAINT "game_library_model_files_entry_fk" FOREIGN KEY ("game_id","kind","source_id") REFERENCES "public"."game_library"("game_id","kind","source_id") ON DELETE cascade ON UPDATE no action;