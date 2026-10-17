CREATE TABLE "character_effects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"character_id" uuid NOT NULL,
	"effect_id" uuid,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "character_effects_once" UNIQUE("character_id","effect_id")
);
--> statement-breakpoint
ALTER TABLE "character_effects" ADD CONSTRAINT "character_effects_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_effects" ADD CONSTRAINT "character_effects_effect_id_effects_id_fk" FOREIGN KEY ("effect_id") REFERENCES "public"."effects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "character_effects_effect_idx" ON "character_effects" USING btree ("effect_id");