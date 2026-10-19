CREATE TABLE "monster_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"monster_id" uuid NOT NULL,
	"item_id" uuid,
	"quantity" integer NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monster_items_once" UNIQUE("monster_id","item_id"),
	CONSTRAINT "monster_items_quantity" CHECK ("monster_items"."quantity" between 1 and 9999)
);
--> statement-breakpoint
CREATE TABLE "monster_effects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"monster_id" uuid NOT NULL,
	"effect_id" uuid,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monster_effects_once" UNIQUE("monster_id","effect_id")
);
--> statement-breakpoint
ALTER TABLE "monster_items" ADD CONSTRAINT "monster_items_monster_id_monsters_id_fk" FOREIGN KEY ("monster_id") REFERENCES "public"."monsters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monster_items" ADD CONSTRAINT "monster_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monster_effects" ADD CONSTRAINT "monster_effects_monster_id_monsters_id_fk" FOREIGN KEY ("monster_id") REFERENCES "public"."monsters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monster_effects" ADD CONSTRAINT "monster_effects_effect_id_effects_id_fk" FOREIGN KEY ("effect_id") REFERENCES "public"."effects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "monster_items_item_idx" ON "monster_items" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "monster_effects_effect_idx" ON "monster_effects" USING btree ("effect_id");