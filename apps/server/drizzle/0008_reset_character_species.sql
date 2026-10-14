-- Вид персонажа стал ключом из справочника (shared: CHARACTER_SPECIES), а раньше был
-- свободным текстом. Старые записи — только тестовые, поэтому не сопоставляем названия,
-- а сбрасываем на человека всё, что ключом не является.
UPDATE "characters"
SET "species" = 'human'
WHERE "species" NOT IN (
	'aasimar', 'changeling', 'dhampir', 'dragonborn', 'dwarf', 'elf', 'gnome',
	'goliath', 'halfling', 'hexblood', 'human', 'kalashtar', 'khoravar', 'lupin',
	'orc', 'reborn', 'shifter', 'tiefling', 'warforged'
);
