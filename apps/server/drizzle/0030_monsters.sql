CREATE TABLE "monster_image_files" (
	"monster_id" uuid NOT NULL,
	"variant" varchar(10) NOT NULL,
	"data" "bytea" NOT NULL,
	CONSTRAINT "monster_image_files_monster_id_variant_pk" PRIMARY KEY("monster_id","variant")
);
--> statement-breakpoint
CREATE TABLE "monster_images" (
	"monster_id" uuid PRIMARY KEY NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"thumb_crop" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monsters" (
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
ALTER TABLE "monster_image_files" ADD CONSTRAINT "monster_image_files_monster_id_monster_images_monster_id_fk" FOREIGN KEY ("monster_id") REFERENCES "public"."monster_images"("monster_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monster_images" ADD CONSTRAINT "monster_images_monster_id_monsters_id_fk" FOREIGN KEY ("monster_id") REFERENCES "public"."monsters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monsters" ADD CONSTRAINT "monsters_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "monsters_author_idx" ON "monsters" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "monsters_public_idx" ON "monsters" USING btree ("updated_at") WHERE "monsters"."is_public";