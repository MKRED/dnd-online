CREATE TABLE "furniture" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"name" varchar(100) NOT NULL,
	"category" varchar(30) NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"extra" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "furniture_image_files" (
	"furniture_id" uuid NOT NULL,
	"variant" varchar(10) NOT NULL,
	"data" "bytea" NOT NULL,
	CONSTRAINT "furniture_image_files_furniture_id_variant_pk" PRIMARY KEY("furniture_id","variant")
);
--> statement-breakpoint
CREATE TABLE "furniture_images" (
	"furniture_id" uuid PRIMARY KEY NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"thumb_crop" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "furniture" ADD CONSTRAINT "furniture_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "furniture_image_files" ADD CONSTRAINT "furniture_image_files_furniture_id_furniture_images_furniture_id_fk" FOREIGN KEY ("furniture_id") REFERENCES "public"."furniture_images"("furniture_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "furniture_images" ADD CONSTRAINT "furniture_images_furniture_id_furniture_id_fk" FOREIGN KEY ("furniture_id") REFERENCES "public"."furniture"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "furniture_author_idx" ON "furniture" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "furniture_public_idx" ON "furniture" USING btree ("updated_at") WHERE "furniture"."is_public";