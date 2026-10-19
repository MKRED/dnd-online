CREATE TABLE "character_abilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"character_id" uuid NOT NULL,
	"ability_id" uuid,
	"prepared" boolean DEFAULT false NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "character_abilities_once" UNIQUE("character_id","ability_id")
);
--> statement-breakpoint
ALTER TABLE "character_abilities" ADD CONSTRAINT "character_abilities_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_abilities" ADD CONSTRAINT "character_abilities_ability_id_abilities_id_fk" FOREIGN KEY ("ability_id") REFERENCES "public"."abilities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "character_abilities_ability_idx" ON "character_abilities" USING btree ("ability_id");