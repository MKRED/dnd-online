CREATE TABLE "character_models" (
	"character_id" uuid PRIMARY KEY NOT NULL,
	"format" varchar(8) NOT NULL,
	"size" integer NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"color" varchar(7),
	"fit" jsonb NOT NULL,
	"data" "bytea" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "character_models" ADD CONSTRAINT "character_models_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;