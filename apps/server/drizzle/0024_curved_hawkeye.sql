ALTER TABLE "items" ADD COLUMN "sources" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "abilities" ADD COLUMN "sources" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "effects" ADD COLUMN "sources" jsonb DEFAULT '[]'::jsonb NOT NULL;