-- Класс персонажа стал ключом из справочника (shared: CHARACTER_CLASSES), а раньше был
-- свободным текстом. Старые записи — только тестовые, поэтому не сопоставляем названия,
-- а сбрасываем каждый класс на воина; подкласс прежнего класса при этом теряет смысл.
UPDATE "characters"
SET "classes" = (
	SELECT jsonb_agg(jsonb_build_object('class', 'fighter', 'level', entry -> 'level'))
	FROM jsonb_array_elements("classes") AS entry
)
WHERE jsonb_array_length("classes") > 0;
