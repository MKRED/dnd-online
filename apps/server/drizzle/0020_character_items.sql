CREATE TABLE "character_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"character_id" uuid NOT NULL,
	"item_id" uuid,
	"location" varchar(20) NOT NULL,
	"quantity" integer NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "character_items_place" UNIQUE("character_id","item_id","location"),
	CONSTRAINT "character_items_location" CHECK ("character_items"."location" in ('carried', 'stash')),
	CONSTRAINT "character_items_quantity" CHECK ("character_items"."quantity" between 1 and 9999)
);
--> statement-breakpoint
ALTER TABLE "character_items" ADD CONSTRAINT "character_items_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_items" ADD CONSTRAINT "character_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "character_items_item_idx" ON "character_items" USING btree ("item_id");