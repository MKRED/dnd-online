CREATE TABLE "abilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"name" varchar(100) NOT NULL,
	"category" varchar(30) NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ability_image_files" (
	"ability_id" uuid NOT NULL,
	"variant" varchar(10) NOT NULL,
	"data" "bytea" NOT NULL,
	CONSTRAINT "ability_image_files_ability_id_variant_pk" PRIMARY KEY("ability_id","variant")
);
--> statement-breakpoint
CREATE TABLE "ability_images" (
	"ability_id" uuid PRIMARY KEY NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"thumb_crop" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "effect_image_files" (
	"effect_id" uuid NOT NULL,
	"variant" varchar(10) NOT NULL,
	"data" "bytea" NOT NULL,
	CONSTRAINT "effect_image_files_effect_id_variant_pk" PRIMARY KEY("effect_id","variant")
);
--> statement-breakpoint
CREATE TABLE "effect_images" (
	"effect_id" uuid PRIMARY KEY NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"thumb_crop" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "effects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"name" varchar(100) NOT NULL,
	"category" varchar(30) NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "abilities" ADD CONSTRAINT "abilities_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ability_image_files" ADD CONSTRAINT "ability_image_files_ability_id_ability_images_ability_id_fk" FOREIGN KEY ("ability_id") REFERENCES "public"."ability_images"("ability_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ability_images" ADD CONSTRAINT "ability_images_ability_id_abilities_id_fk" FOREIGN KEY ("ability_id") REFERENCES "public"."abilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "effect_image_files" ADD CONSTRAINT "effect_image_files_effect_id_effect_images_effect_id_fk" FOREIGN KEY ("effect_id") REFERENCES "public"."effect_images"("effect_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "effect_images" ADD CONSTRAINT "effect_images_effect_id_effects_id_fk" FOREIGN KEY ("effect_id") REFERENCES "public"."effects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "effects" ADD CONSTRAINT "effects_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "abilities_author_idx" ON "abilities" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "abilities_public_idx" ON "abilities" USING btree ("updated_at") WHERE "abilities"."is_public";--> statement-breakpoint
CREATE INDEX "effects_author_idx" ON "effects" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "effects_public_idx" ON "effects" USING btree ("updated_at") WHERE "effects"."is_public";