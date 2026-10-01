ALTER TABLE "characters" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
-- Существующие персонажи ещё не редактировались — их «последнее изменение» = создание.
UPDATE "characters" SET "updated_at" = "created_at";