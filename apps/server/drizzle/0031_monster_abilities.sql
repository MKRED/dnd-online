CREATE TABLE "monster_abilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"monster_id" uuid NOT NULL,
	"ability_id" uuid,
	"per_day" integer,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monster_abilities_once" UNIQUE("monster_id","ability_id")
);
--> statement-breakpoint
ALTER TABLE "monster_abilities" ADD CONSTRAINT "monster_abilities_monster_id_monsters_id_fk" FOREIGN KEY ("monster_id") REFERENCES "public"."monsters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monster_abilities" ADD CONSTRAINT "monster_abilities_ability_id_abilities_id_fk" FOREIGN KEY ("ability_id") REFERENCES "public"."abilities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "monster_abilities_ability_idx" ON "monster_abilities" USING btree ("ability_id");