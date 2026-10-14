# Character species

Reference for the species data behind the character sheet. The sheet follows the **2024 edition** of DnD 5e (which renamed "race" to "species"), so the list below is 2024 only. Researched on 2026-10-14.

## How it is used in code

- `packages/shared/src/character.ts` — `CHARACTER_SPECIES`, the 20 species keys. A character stores the key (`elf`), never the Russian name.
- `apps/server/src/characters/dto/create-character.dto.ts` — the server rejects a species outside that list.
- `apps/web/src/features/characters/characterSpecies.ts` — Russian names (`SPECIES_LABELS`) and the sorted select options.
- The form (`CharacterForm/IdentitySection/IdentitySection.tsx`) offers the species as a strict select: unlike the subclass, a homebrew species cannot be typed in.

Six species also make a choice inside the species (elven lineage, draconic ancestry and the like); see [Choices inside a species](#choices-inside-a-species-lineage).

## Sources

| Code | Book                                    |
| ---- | --------------------------------------- |
| PHB  | Player's Handbook (2024)                |
| FotA | Eberron: Forge of the Artificer (2025)  |
| RHW  | Ravenloft: The Horrors Within (2026)    |
| ABH  | Astarion's Book of Hungers              |
| LFL  | Lorwyn: First Light                     |
| DDB  | D&D Beyond Drops (digital, subscribers) |

The app offers 20 species: the 19 of the PHB, FotA and RHW (10, 5 and 4), plus the Faerie from LFL, added at the user's request on 2026-10-14. Forgotten Realms: Heroes of Faerûn and Arcana Unleashed add no species.

## Species

| Key          | Russian           | English    | Source   |
| ------------ | ----------------- | ---------- | -------- |
| `aasimar`    | Аасимар           | Aasimar    | PHB      |
| `dragonborn` | Драконорождённый  | Dragonborn | PHB      |
| `dwarf`      | Дварф             | Dwarf      | PHB      |
| `elf`        | Эльф              | Elf        | PHB      |
| `gnome`      | Гном              | Gnome      | PHB      |
| `goliath`    | Голиаф            | Goliath    | PHB      |
| `halfling`   | Полурослик        | Halfling   | PHB      |
| `human`      | Человек           | Human      | PHB      |
| `orc`        | Орк               | Orc        | PHB      |
| `tiefling`   | Тифлинг           | Tiefling   | PHB      |
| `changeling` | Ченжлинг          | Changeling | FotA     |
| `kalashtar`  | Калаштар          | Kalashtar  | FotA     |
| `khoravar`   | Кхоравар          | Khoravar   | FotA     |
| `shifter`    | Шифтер            | Shifter    | FotA     |
| `warforged`  | Кованый           | Warforged  | FotA     |
| `dhampir`    | Дампир            | Dhampir    | RHW, ABH |
| `hexblood`   | Ведьмовская кровь | Hexblood   | RHW      |
| `lupin`      | Волколак          | Lupin      | RHW      |
| `reborn`     | Возрождённый      | Reborn     | RHW      |
| `faerie`     | Фея               | Faerie     | LFL      |

## Not in the app

| English           | Source | Why                                   |
| ----------------- | ------ | ------------------------------------- |
| Boggart           | LFL    | no Russian name yet, sources disagree |
| Flamekin          | LFL    | same                                  |
| Lorwyn Changeling | LFL    | same                                  |
| Rimekin           | LFL    | same                                  |
| Duskling          | DDB    | subscriber-only drop, unconfirmed     |

The species of the 2014 books (Tabaxi, Tortle, Genasi, Firbolg and the rest of Mordenkainen Presents: Monsters of the Multiverse) are also absent: they have no 2024 reprint. The 2024 rules allow using them as they are, so a table that plays one has no way to pick it yet.

## Choices inside a species (lineage)

The 2024 rules have no subraces. Instead, six species make a one-time choice when the species is picked (so from level 1, unlike the subclass). The sheet stores it in `speciesLineage`.

- `packages/shared/src/character.ts` — `SPECIES_WITH_LINEAGE`, the six species that have the choice.
- `apps/web/src/features/characters/characterSpeciesLineages.ts` — the Russian trait name (used as the field label) and the options per species.
- The form (`CharacterForm/IdentitySection/SpeciesFields.tsx`) shows it next to the species as an autocomplete: the book options are suggested, but a custom value can be typed (same decision as for the subclass, agreed with the user on 2026-10-14). The field is locked for a species without the choice and cleared when the species changes.
- The server (`dto/nested/lineage-for-species.validator.ts`) rejects a lineage for a species outside `SPECIES_WITH_LINEAGE`; the value itself is free text, 1–50 characters.

| Species    | Trait (RU / EN)                       | Options (RU / EN)                                                                                                                                                              |
| ---------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Elf        | Эльфийский род / Elven Lineage        | Высший эльф / High Elf, Дроу / Drow, Лесной эльф / Wood Elf                                                                                                                    |
| Gnome      | Гномий род / Gnomish Lineage          | Лесной гном / Forest Gnome, Скальный гном / Rock Gnome                                                                                                                         |
| Tiefling   | Наследие исчадий / Fiendish Legacy    | Инфернальное наследие / Infernal, Наследие Бездны / Abyssal, Хтоническое наследие / Chthonic                                                                                   |
| Goliath    | Наследие великанов / Giant Ancestry   | Облачный / Cloud, Огненный / Fire, Ледяной / Frost, Холмовой / Hill, Каменный / Stone, Штормовой великан / Storm Giant                                                         |
| Dragonborn | Наследие драконов / Draconic Ancestry | Чёрный / Black, Синий / Blue, Латунный / Brass, Бронзовый / Bronze, Медный / Copper, Золотой / Gold, Зелёный / Green, Красный / Red, Серебряный / Silver, Белый дракон / White |
| Shifter    | Переворот / Shifting                  | Звериная шкура / Beasthide, Длинные зубы / Longtooth, Быстрая поступь / Swiftstride, Дикая охота / Wildhunt                                                                    |

Notes:

- English names are from dnd2024.wikidot, Russian ones from the next.dnd.su species pages (`/species/<key>`); the pairs were matched by hand.
- The app's wording departs slightly from next.dnd.su: the elven options are singular («Высший эльф», the site has «Высшие эльфы») and the dragons carry the word «дракон» («Белый дракон», the site's table has «Белый»), so the value reads on its own in the character list.
- **Aasimar has no such choice**: Celestial Revelation (Heavenly Wings, Inner Radiance, Necrotic Shroud) is picked each time the aasimar transforms.
- Dwarf, Faerie, Halfling, Human and Orc have none. For Changeling, Kalashtar, Khoravar, Warforged, Dhampir, Hexblood and Reborn this rests on the dungeonmister trait summary only; Lupin was checked on its wikidot page.
- dnd2024.wikidot also lists Lorwyn Elf and Shadowmoor Elf lineages (Lorwyn: First Light); they are not suggested, like the Lorwyn species.
- Choices that are not a lineage are not recorded: size (Medium or Small), a skill, a spellcasting ability.

## What is uncertain

- **Russian names are fan translations** from next.dnd.su. That site lists exactly the same 19 species (all but the Faerie), each with its English name, so the RU↔EN pairs are not guesswork here.
- **Faerie / Фея.** next.dnd.su has no page for it yet; «Фея» is the name the user chose (2026-10-14). The species comes from dnd2024.wikidot (`/species:faerie`, Lorwyn: First Light): Small, creature type Fey, no lineage choice (Shadowmoor faeries only differ in darkvision range; the Fairy Magic spellcasting ability is a choice that is not a lineage). Unlike the Lorwyn species still left out, dungeonmister does not list it, so its status in LFL rests on wikidot alone.
- **Lorwyn: First Light.** The sources disagree: dnd2024.wikidot lists five species, dungeonmister only two (Lorwyn Changeling, Rimekin).
- **Duskling** is listed by dungeonmister and dnd2024.wikidot as a D&D Beyond Drop; no official page was checked.

## Links

- [next.dnd.su — виды 2024](https://next.dnd.su/race/) (Russian and English names, source filter)
- [dnd2024.wikidot — Elf](https://dnd2024.wikidot.com/species:elf) (species pages are `/species:<key>`; used for the lineage options)
- [dungeonmister — playable species in D&D 2024](https://dungeonmister.com/guides/races-and-species-in-dnd-2024/) (updated 2026-09-05)
- [dnd2024.wikidot — species](https://dnd2024.wikidot.com/species:all)
- [D&D Beyond — the 10 species in the 2024 Player's Handbook](https://www.dndbeyond.com/posts/1783-the-10-species-in-the-2024-players-handbook)
