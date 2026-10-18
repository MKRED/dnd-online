CREATE TABLE "bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"character_id" uuid,
	"item_id" uuid,
	"ability_id" uuid,
	"effect_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookmarks_character_once" UNIQUE("user_id","character_id"),
	CONSTRAINT "bookmarks_item_once" UNIQUE("user_id","item_id"),
	CONSTRAINT "bookmarks_ability_once" UNIQUE("user_id","ability_id"),
	CONSTRAINT "bookmarks_effect_once" UNIQUE("user_id","effect_id"),
	CONSTRAINT "bookmarks_one_target" CHECK (num_nonnulls("bookmarks"."character_id", "bookmarks"."item_id", "bookmarks"."ability_id", "bookmarks"."effect_id") = 1)
);
--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_ability_id_abilities_id_fk" FOREIGN KEY ("ability_id") REFERENCES "public"."abilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_effect_id_effects_id_fk" FOREIGN KEY ("effect_id") REFERENCES "public"."effects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookmarks_character_idx" ON "bookmarks" USING btree ("character_id");--> statement-breakpoint
CREATE INDEX "bookmarks_item_idx" ON "bookmarks" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "bookmarks_ability_idx" ON "bookmarks" USING btree ("ability_id");--> statement-breakpoint
CREATE INDEX "bookmarks_effect_idx" ON "bookmarks" USING btree ("effect_id");