CREATE TABLE "maps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"palette" jsonb NOT NULL,
	"seq" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "map_chunks" (
	"map_id" uuid NOT NULL,
	"cx" integer NOT NULL,
	"cy" integer NOT NULL,
	"cz" integer NOT NULL,
	"data" "bytea" NOT NULL,
	CONSTRAINT "map_chunks_map_id_cx_cy_cz_pk" PRIMARY KEY("map_id","cx","cy","cz")
);
--> statement-breakpoint
CREATE TABLE "map_ops" (
	"map_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"kind" varchar(10) NOT NULL,
	"target_seq" integer,
	"ops" jsonb,
	"changeset" jsonb NOT NULL,
	"undone" boolean DEFAULT false NOT NULL,
	"author_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "map_ops_map_id_seq_pk" PRIMARY KEY("map_id","seq")
);
--> statement-breakpoint
ALTER TABLE "maps" ADD CONSTRAINT "maps_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "map_chunks" ADD CONSTRAINT "map_chunks_map_id_maps_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."maps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "map_ops" ADD CONSTRAINT "map_ops_map_id_maps_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."maps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "map_ops" ADD CONSTRAINT "map_ops_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;