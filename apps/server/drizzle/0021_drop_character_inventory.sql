-- Старый инвентарь свободным списком заменила таблица character_items (0020). В форме
-- этого поля не было, задать его можно было только запросом к API, поэтому ожидаем, что
-- он везде пуст. Если нет — останавливаемся, а не теряем данные молча.
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM "characters" WHERE jsonb_array_length("inventory") > 0) THEN
		RAISE EXCEPTION 'characters.inventory не пуст: перенесите или удалите эти записи перед миграцией';
	END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "characters" DROP COLUMN "inventory";
