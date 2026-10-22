CREATE TABLE "block_group_image_files" (
	"block_group_id" uuid NOT NULL,
	"variant" varchar(10) NOT NULL,
	"data" "bytea" NOT NULL,
	CONSTRAINT "block_group_image_files_block_group_id_variant_pk" PRIMARY KEY("block_group_id","variant")
);
--> statement-breakpoint
CREATE TABLE "block_group_images" (
	"block_group_id" uuid PRIMARY KEY NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"thumb_crop" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "block_groups" (
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
ALTER TABLE "block_group_image_files" ADD CONSTRAINT "block_group_image_files_block_group_id_block_group_images_block_group_id_fk" FOREIGN KEY ("block_group_id") REFERENCES "public"."block_group_images"("block_group_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block_group_images" ADD CONSTRAINT "block_group_images_block_group_id_block_groups_id_fk" FOREIGN KEY ("block_group_id") REFERENCES "public"."block_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block_groups" ADD CONSTRAINT "block_groups_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "block_groups_author_idx" ON "block_groups" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "block_groups_public_idx" ON "block_groups" USING btree ("updated_at") WHERE "block_groups"."is_public";