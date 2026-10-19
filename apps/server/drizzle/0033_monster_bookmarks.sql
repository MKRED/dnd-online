ALTER TABLE "bookmarks" DROP CONSTRAINT "bookmarks_one_target";--> statement-breakpoint
ALTER TABLE "bookmarks" ADD COLUMN "monster_id" uuid;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_monster_id_monsters_id_fk" FOREIGN KEY ("monster_id") REFERENCES "public"."monsters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookmarks_monster_idx" ON "bookmarks" USING btree ("monster_id");--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_monster_once" UNIQUE("user_id","monster_id");--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_one_target" CHECK (num_nonnulls("bookmarks"."character_id", "bookmarks"."item_id", "bookmarks"."ability_id", "bookmarks"."effect_id", "bookmarks"."monster_id") = 1);