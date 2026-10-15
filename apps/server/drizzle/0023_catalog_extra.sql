ALTER TABLE "abilities" ADD COLUMN "extra" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "effects" ADD COLUMN "extra" jsonb DEFAULT '{}'::jsonb NOT NULL;