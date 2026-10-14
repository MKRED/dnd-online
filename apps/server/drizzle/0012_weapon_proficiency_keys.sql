-- Владение оружием стало списком ключей из справочника (shared: WEAPON_PROFICIENCIES), а
-- раньше было свободным текстом. Русские названия из подсказок формы переводим в ключи
-- (без учёта регистра), всё остальное убираем, повторы схлопываем.
UPDATE "characters"
SET "proficiencies" = jsonb_set(
	"proficiencies",
	'{weapons}',
	COALESCE(
		(
			SELECT jsonb_agg(DISTINCT mapping.key)
			FROM jsonb_array_elements_text("proficiencies" -> 'weapons') AS item
			JOIN (
				VALUES
					('простое оружие', 'simple'),
					('воинское оружие', 'martial'),
					('боевой посох', 'quarterstaff'),
					('булава', 'mace'),
					('дубинка', 'club'),
					('кинжал', 'dagger'),
					('копьё', 'spear'),
					('лёгкий молот', 'lightHammer'),
					('метательное копьё', 'javelin'),
					('одноручный топор', 'handaxe'),
					('палица', 'greatclub'),
					('серп', 'sickle'),
					('дротик', 'dart'),
					('короткий лук', 'shortbow'),
					('лёгкий арбалет', 'lightCrossbow'),
					('праща', 'sling'),
					('алебарда', 'halberd'),
					('боевой молот', 'warhammer'),
					('боевой топор', 'battleaxe'),
					('глефа', 'glaive'),
					('двуручный меч', 'greatsword'),
					('длинный меч', 'longsword'),
					('кавалерийское копьё', 'lance'),
					('клевец', 'warPick'),
					('кнут', 'whip'),
					('короткий меч', 'shortsword'),
					('молот', 'maul'),
					('моргенштерн', 'morningstar'),
					('пика', 'pike'),
					('рапира', 'rapier'),
					('секира', 'greataxe'),
					('скимитар', 'scimitar'),
					('трезубец', 'trident'),
					('цеп', 'flail'),
					('длинный лук', 'longbow'),
					('духовая трубка', 'blowgun'),
					('мушкет', 'musket'),
					('одноручный арбалет', 'handCrossbow'),
					('пистоль', 'pistol'),
					('тяжёлый арбалет', 'heavyCrossbow')
			) AS mapping(label, key)
				ON mapping.label = lower(trim(item)) OR mapping.key = trim(item)
		),
		'[]'::jsonb
	)
)
WHERE jsonb_typeof("proficiencies" -> 'weapons') = 'array';
