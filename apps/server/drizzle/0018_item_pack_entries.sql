CREATE TABLE "item_pack_entries" (
	"pack_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "item_pack_entries_pack_id_item_id_pk" PRIMARY KEY("pack_id","item_id"),
	CONSTRAINT "item_pack_entries_quantity" CHECK ("item_pack_entries"."quantity" between 1 and 1000)
);
--> statement-breakpoint
ALTER TABLE "item_pack_entries" ADD CONSTRAINT "item_pack_entries_pack_id_items_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_pack_entries" ADD CONSTRAINT "item_pack_entries_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "item_pack_entries_item_idx" ON "item_pack_entries" USING btree ("item_id");