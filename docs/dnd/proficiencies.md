# Proficiencies on the character sheet

Reference for the «Владения и снаряжение» section of the character sheet (2024 edition). Researched on 2026-10-14. Armor training and weapon proficiency are strict lists stored as keys. Weapon masteries, tools and languages are free text with suggestions from the book lists below. «Прочие владения» is plain text for everything else.

## Armor training

- **Rule:** "Anyone can don armor or hold a Shield, but only those with training can use them effectively" (free rules, Equipment, Armor Training). There are exactly four categories: Light, Medium and Heavy armor, and Shields.
  - Light, Medium or Heavy armor without training: Disadvantage on any D20 Test that involves Strength or Dexterity, and no spellcasting.
  - A Shield gives its Armor Class benefit only with training.
- **In the app (decided with the user on 2026-10-14):** four checkboxes instead of free text. A character can have any combination, including none.
  - `packages/shared/src/character.ts` — `ARMOR_TRAINING`, the four keys, and `CharacterProficiencies.armor`. A character stores the keys, never the Russian names.
  - `apps/server/src/characters/dto/nested/equipment.dto.ts` — the server rejects any other value and duplicates.
  - `apps/web/src/features/characters/characterArmorTraining.ts` — the Russian names.
  - `CharacterForm/ProficienciesSection.tsx` — the checkbox group «Доспехи».
- **Departures from the book:** the training is not derived from the class, species or feats; the player ticks it by hand (same approach as the hit die, see [combat-stats.md](combat-stats.md)). The penalties for untrained armor are not applied to rolls; since 2026-10-26 the sheet's AC tile warns about armor worn without training, and a shield without training adds no AC ([weapons-armor.md](weapons-armor.md#числа-от-экипировки)).
- **Old data:** the field used to be free text. Migration `0011_armor_training_keys.sql` turns Russian names into keys by the start of the word and drops what it cannot recognise.

| Key      | Russian (in the form) | English      |
| -------- | --------------------- | ------------ |
| `light`  | Лёгкие                | Light armor  |
| `medium` | Средние               | Medium armor |
| `heavy`  | Тяжёлые               | Heavy armor  |
| `shield` | Щиты                  | Shields      |

Notes:

- Russian names are a fan translation from next.dnd.su: the Fighter page has «Тренированность с доспехами: Лёгкие, Средние и Тяжёлые доспехи и Щиты». The form labels the group «Доспехи», not «Тренированность с доспехами», to match the neighbouring «Оружие» and «Инструменты».
- **Unverified:** which class gives which training was not collected; the app does not need it.

## Weapon proficiency

- **Rule:** "Anyone can wield a weapon, but you must have proficiency with it to add your Proficiency Bonus to an attack roll you make with it. A player character's features can provide weapon proficiencies" (free rules, Equipment, Weapon Proficiency). Every weapon is Simple or Martial, and proficiency is usually tied to one of those categories.
- **In the app (decided with the user on 2026-10-14):** a strict multi-select. The player picks from the two categories («Простое оружие», «Воинское оружие») and the 38 weapons of the table below; a custom value cannot be typed.
  - `packages/shared/src/weapons.ts` — `WEAPONS_BY_GROUP` (the weapon keys in four groups), `WEAPON_CATEGORIES` (`simple`, `martial`) and `WEAPON_PROFICIENCIES` (both together). `CharacterProficiencies.weapons` stores these keys. A weapon key is the English name in camelCase (`lightHammer`, `warPick`).
  - `apps/server/src/characters/dto/nested/equipment.dto.ts` — the server rejects any other value and duplicates.
  - `apps/web/src/features/characters/characterWeapons.ts` — the Russian names and the grouped options.
  - `CharacterForm/ProficienciesSection.tsx` — the select «Оружие».
- **Departures from the book:** a proficiency that is neither a category nor a single weapon (for example "Martial weapons that have a certain property") cannot be picked; the player ticks the weapons one by one or writes it in «Прочие владения». Weapons from other books are not in the list. Nothing is derived from the class. The «Атаки» block of the sheet adds the Proficiency Bonus for a weapon whose category or kind is ticked (since 2026-10-26).
- **Old data:** the field used to be free text. Migration `0012_weapon_proficiency_keys.sql` turns the Russian names of the table into keys and drops everything else.

| Group          | Russian             | English        | Mastery (RU / EN)       |
| -------------- | ------------------- | -------------- | ----------------------- |
| Simple melee   | Боевой посох        | Quarterstaff   | Опрокидывающее / Topple |
| Simple melee   | Булава              | Mace           | Ослабляющее / Sap       |
| Simple melee   | Дубинка             | Club           | Замедляющее / Slow      |
| Simple melee   | Кинжал              | Dagger         | Быстрое / Nick          |
| Simple melee   | Копьё               | Spear          | Ослабляющее / Sap       |
| Simple melee   | Лёгкий молот        | Light Hammer   | Быстрое / Nick          |
| Simple melee   | Метательное копьё   | Javelin        | Замедляющее / Slow      |
| Simple melee   | Одноручный топор    | Handaxe        | Отвлекающее / Vex       |
| Simple melee   | Палица              | Greatclub      | Отталкивающее / Push    |
| Simple melee   | Серп                | Sickle         | Быстрое / Nick          |
| Simple ranged  | Дротик              | Dart           | Отвлекающее / Vex       |
| Simple ranged  | Короткий лук        | Shortbow       | Отвлекающее / Vex       |
| Simple ranged  | Лёгкий арбалет      | Light Crossbow | Замедляющее / Slow      |
| Simple ranged  | Праща               | Sling          | Замедляющее / Slow      |
| Martial melee  | Алебарда            | Halberd        | Прорубающее / Cleave    |
| Martial melee  | Боевой молот        | Warhammer      | Отталкивающее / Push    |
| Martial melee  | Боевой топор        | Battleaxe      | Опрокидывающее / Topple |
| Martial melee  | Глефа               | Glaive         | Секущее / Graze         |
| Martial melee  | Двуручный меч       | Greatsword     | Секущее / Graze         |
| Martial melee  | Длинный меч         | Longsword      | Ослабляющее / Sap       |
| Martial melee  | Кавалерийское копьё | Lance          | Опрокидывающее / Topple |
| Martial melee  | Клевец              | War Pick       | Ослабляющее / Sap       |
| Martial melee  | Кнут                | Whip           | Замедляющее / Slow      |
| Martial melee  | Короткий меч        | Shortsword     | Отвлекающее / Vex       |
| Martial melee  | Молот               | Maul           | Опрокидывающее / Topple |
| Martial melee  | Моргенштерн         | Morningstar    | Ослабляющее / Sap       |
| Martial melee  | Пика                | Pike           | Отталкивающее / Push    |
| Martial melee  | Рапира              | Rapier         | Отвлекающее / Vex       |
| Martial melee  | Секира              | Greataxe       | Прорубающее / Cleave    |
| Martial melee  | Скимитар            | Scimitar       | Быстрое / Nick          |
| Martial melee  | Трезубец            | Trident        | Опрокидывающее / Topple |
| Martial melee  | Цеп                 | Flail          | Ослабляющее / Sap       |
| Martial ranged | Длинный лук         | Longbow        | Замедляющее / Slow      |
| Martial ranged | Духовая трубка      | Blowgun        | Отвлекающее / Vex       |
| Martial ranged | Мушкет              | Musket         | Замедляющее / Slow      |
| Martial ranged | Одноручный арбалет  | Hand Crossbow  | Отвлекающее / Vex       |
| Martial ranged | Пистоль             | Pistol         | Отвлекающее / Vex       |
| Martial ranged | Тяжёлый арбалет     | Heavy Crossbow | Отталкивающее / Push    |

The app does not use the mastery column; it is here for reference.

## Suggested lists: weapon mastery, tools, languages

**In the app (decided with the user on 2026-10-14):** these three fields work like the subclass. The form suggests the book values in a grouped dropdown, but the player can type a custom one, and the character stores the text as entered (`Character.weaponMasteries`, `CharacterProficiencies.tools`, `.languages`). The server only checks that they are strings.

The suggestions live in `apps/web/src/features/characters/`: `characterWeapons.ts` (`WEAPON_SUGGESTIONS`), `characterTools.ts`, `characterLanguages.ts`. The fields are in `CharacterForm/ProficienciesSection.tsx`.

### Weapon mastery

- **Rule:** "Each weapon has a mastery property, which is usable only by a character who has a feature, such as Weapon Mastery, that unlocks the property for the character" (free rules, Equipment, Mastery Properties). The eight properties are Cleave, Graze, Nick, Push, Sap, Slow, Topple and Vex.
- «Мастерство оружия» lists the weapons whose mastery property the character has unlocked. It suggests the Russian names of the 38 weapons above.

### Tools

Free rules, Equipment, Tools. The form suggests each gaming set and each musical instrument by name, not «Игровой набор» or «Музыкальный инструмент».

- **Artisan's tools:** Инструменты алхимика (Alchemist's Supplies), гончара (Potter's Tools), каллиграфа (Calligrapher's Supplies), каменщика (Mason's Tools), картографа (Cartographer's Tools), кожевника (Leatherworker's Tools), кузнеца (Smith's Tools), пивовара (Brewer's Supplies), плотника (Carpenter's Tools), повара (Cook's Utensils), резчика по дереву (Woodcarver's Tools), ремонтника (Tinker's Tools), сапожника (Cobbler's Tools), стеклодува (Glassblower's Tools), ткача (Weaver's Tools), художника (Painter's Supplies), ювелира (Jeweler's Tools).
- **Other tools:** Воровские инструменты (Thieves' Tools), Инструменты навигатора (Navigator's Tools), Инструменты отравителя (Poisoner's Kit), Набор для грима (Disguise Kit), Набор для фальсификации (Forgery Kit), Набор травника (Herbalism Kit).
- **Gaming sets:** Драконьи шахматы (Dragonchess), Игральные карты (Playing cards), Кости (Dice), Ставка трёх драконов (Three-dragon ante).
- **Musical instruments:** Барабан (Drum), Виола (Viol), Волынка (Bagpipes), Дульцимер (Dulcimer), Лира (Lyre), Лютня (Lute), Рожок (Horn), Флейта (Flute), Флейта Пана (Pan flute), Шалмей (Shawm).

### Languages

Free rules, Creating a Character: a character knows Common plus two languages from the Standard table; rare languages come from features.

- **Standard:** Общий (Common), Общий жестовый (Common Sign Language), Великаний (Giant), Гномий (Gnomish), Гоблинский (Goblin), Дварфийский (Dwarvish), Драконий (Draconic), Орочий (Orc), Эльфийский (Elvish), Язык полуросликов (Halfling).
- **Rare:** Воровской жаргон (Thieves' Cant), Глубинная речь (Deep Speech), Друидический (Druidic), Инфернальный (Infernal), Небесный (Celestial), Первичный (Primordial), Подземный (Undercommon), Сильван (Sylvan), Язык Бездны (Abyssal).

Primordial has four dialects (Aquan, Auran, Ignan, Terran; Акван, Ауран, Игнан, Терран) whose speakers understand each other. The form suggests only «Первичный».

## Other proficiencies

**In the app (decided with the user on 2026-10-14):** «Прочие владения» is a plain text field, up to 500 characters, for whatever does not fit the fields above. It is stored as `CharacterProficiencies.other` inside the same jsonb column, so characters saved before it simply lack the key. This is not a book rule.

## What is uncertain

- **Russian names are fan translations** from next.dnd.su. Its pages give no English names, so the RU↔EN pairs above were matched by hand.
- next.dnd.su calls the viol «Виола да гамба»; the form shortens it to «Виола». The site also lists instruments that are not in the 2024 tool list (Бандура, Цистра, Яртинг); they are not suggested.
- That proficiency is separate for each gaming set and each musical instrument was not checked against the rule text.
- Which class gives which weapon proficiency (including the ones tied to a weapon property), and which classes get Weapon Mastery and for how many weapons, was not collected.
- Weapons, tools and languages from books other than the free rules were not collected.

## Links

- [D&D Beyond free rules — Equipment](https://www.dndbeyond.com/sources/dnd/free-rules/equipment) (Armor Training, Weapons, Mastery Properties, Tools)
- [D&D Beyond free rules — Creating a Character](https://www.dndbeyond.com/sources/dnd/free-rules/creating-a-character) (languages)
- [next.dnd.su — Воин](https://next.dnd.su/class/fighter) (Russian wording of armor training)
- [next.dnd.su — Оружие и доспехи](https://next.dnd.su/inventory/weapons-and-armor) (Russian weapon and mastery names)
- [next.dnd.su — Снаряжение](https://next.dnd.su/equipment/) (Russian tool names)
- [next.dnd.su — Языки](https://next.dnd.su/mechanics/languages) (Russian language names)
