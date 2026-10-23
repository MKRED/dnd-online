CREATE TABLE "voxel_model_image_files" (
	"voxel_model_id" uuid NOT NULL,
	"variant" varchar(10) NOT NULL,
	"data" "bytea" NOT NULL,
	CONSTRAINT "voxel_model_image_files_voxel_model_id_variant_pk" PRIMARY KEY("voxel_model_id","variant")
);
--> statement-breakpoint
CREATE TABLE "voxel_model_images" (
	"voxel_model_id" uuid PRIMARY KEY NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"thumb_crop" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voxel_models" (
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
ALTER TABLE "voxel_model_image_files" ADD CONSTRAINT "voxel_model_image_files_voxel_model_id_voxel_model_images_voxel_model_id_fk" FOREIGN KEY ("voxel_model_id") REFERENCES "public"."voxel_model_images"("voxel_model_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voxel_model_images" ADD CONSTRAINT "voxel_model_images_voxel_model_id_voxel_models_id_fk" FOREIGN KEY ("voxel_model_id") REFERENCES "public"."voxel_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voxel_models" ADD CONSTRAINT "voxel_models_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "voxel_models_author_idx" ON "voxel_models" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "voxel_models_public_idx" ON "voxel_models" USING btree ("updated_at") WHERE "voxel_models"."is_public";