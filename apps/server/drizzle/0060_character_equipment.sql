CREATE TABLE "character_equipment" (
	"character_id" uuid NOT NULL,
	"slot" varchar(20) NOT NULL,
	"entry_id" uuid NOT NULL,
	CONSTRAINT "character_equipment_character_id_slot_pk" PRIMARY KEY("character_id","slot"),
	CONSTRAINT "character_equipment_slot" CHECK ("character_equipment"."slot" in ('head', 'cloak', 'body', 'hands', 'feet', 'amulet', 'ring1', 'ring2', 'meleeMain', 'meleeOff', 'rangedMain', 'rangedOff'))
);
--> statement-breakpoint
ALTER TABLE "character_items" ADD COLUMN "attuned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "character_equipment" ADD CONSTRAINT "character_equipment_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_equipment" ADD CONSTRAINT "character_equipment_entry_id_character_items_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."character_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "character_equipment_entry_idx" ON "character_equipment" USING btree ("entry_id");