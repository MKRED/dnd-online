CREATE TABLE "map_objects" (
	"map_id" uuid NOT NULL,
	"id" integer NOT NULL,
	"kind" varchar(20) NOT NULL,
	"x" integer NOT NULL,
	"y" integer NOT NULL,
	"z" integer NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"fields" jsonb NOT NULL,
	CONSTRAINT "map_objects_map_id_id_pk" PRIMARY KEY("map_id","id")
);
--> statement-breakpoint
ALTER TABLE "maps" ADD COLUMN "next_object_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "map_objects" ADD CONSTRAINT "map_objects_map_id_maps_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."maps"("id") ON DELETE cascade ON UPDATE no action;