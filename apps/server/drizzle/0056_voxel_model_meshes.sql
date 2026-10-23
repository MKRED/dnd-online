CREATE TABLE "voxel_model_meshes" (
	"model_id" uuid PRIMARY KEY NOT NULL,
	"format" varchar(8) NOT NULL,
	"size" integer NOT NULL,
	"data" "bytea" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "voxel_model_meshes" ADD CONSTRAINT "voxel_model_meshes_model_id_voxel_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."voxel_models"("id") ON DELETE cascade ON UPDATE no action;