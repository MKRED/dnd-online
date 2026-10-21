ALTER TABLE "character_effects" ADD COLUMN "source_effect_id" uuid;--> statement-breakpoint
-- Старые строки: исходный id — тот, на который ссылаются сейчас. Удалённые до этой
-- миграции (effect_id = null) остаются без него: их копию игра уже не найдёт.
UPDATE "character_effects" SET "source_effect_id" = "effect_id";
