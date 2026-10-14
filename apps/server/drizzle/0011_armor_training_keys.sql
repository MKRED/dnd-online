-- Владение доспехами стало списком ключей из справочника (shared: ARMOR_TRAINING), а раньше
-- было свободным текстом. Русские названия переводим в ключи по началу слова («Лёгкие»,
-- «легкие доспехи» → light), всё нераспознанное убираем, повторы схлопываем.
UPDATE "characters"
SET "proficiencies" = jsonb_set(
	"proficiencies",
	'{armor}',
	COALESCE(
		(
			SELECT jsonb_agg(DISTINCT mapped.key)
			FROM (
				SELECT CASE
					WHEN lower(item) IN ('light', 'medium', 'heavy', 'shield') THEN lower(item)
					WHEN lower(item) LIKE 'лёгк%' OR lower(item) LIKE 'легк%' THEN 'light'
					WHEN lower(item) LIKE 'средн%' THEN 'medium'
					WHEN lower(item) LIKE 'тяж%' THEN 'heavy'
					WHEN lower(item) LIKE 'щит%' THEN 'shield'
				END AS key
				FROM jsonb_array_elements_text("proficiencies" -> 'armor') AS item
			) AS mapped
			WHERE mapped.key IS NOT NULL
		),
		'[]'::jsonb
	)
)
WHERE jsonb_typeof("proficiencies" -> 'armor') = 'array';
