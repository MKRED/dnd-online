CREATE TABLE "character_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"character_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"is_main" boolean DEFAULT false NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"thumb_crop" jsonb NOT NULL,
	"thumb_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "character_image_files" (
	"image_id" uuid NOT NULL,
	"variant" varchar(10) NOT NULL,
	"data" "bytea" NOT NULL,
	CONSTRAINT "character_image_files_image_id_variant_pk" PRIMARY KEY("image_id","variant")
);
--> statement-breakpoint
ALTER TABLE "character_images" ADD CONSTRAINT "character_images_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_image_files" ADD CONSTRAINT "character_image_files_image_id_character_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."character_images"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "character_images_character_idx" ON "character_images" USING btree ("character_id");--> statement-breakpoint
CREATE UNIQUE INDEX "character_images_main_idx" ON "character_images" USING btree ("character_id") WHERE "character_images"."is_main";