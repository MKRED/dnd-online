CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"name" varchar(100) NOT NULL,
	"category" varchar(30) NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"weight" numeric(8, 2) DEFAULT 0 NOT NULL,
	"cost_amount" integer,
	"cost_coin" varchar(2),
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "items_cost_pair" CHECK (("items"."cost_amount" is null) = ("items"."cost_coin" is null))
);
--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "items_author_idx" ON "items" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "items_public_idx" ON "items" USING btree ("updated_at") WHERE "items"."is_public";