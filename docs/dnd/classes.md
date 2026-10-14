# Character classes and subclasses

Reference for the class data behind the character sheet. The sheet follows the **2024 edition** of DnD 5e, so the lists below are 2024 only. Researched on 2026-10-14.

## How it is used in code

- `packages/shared/src/character.ts` — `CHARACTER_CLASSES`, the 13 class keys. A character stores the key (`fighter`), never the Russian name.
- `apps/server/src/characters/dto/nested/basics.dto.ts` — the server rejects a class outside that list. The subclass stays free text (1–50 characters).
- `apps/web/src/features/characters/characterClasses.ts` — Russian class names (`CLASS_LABELS`) and the subclass suggestions per class (`SUBCLASS_SUGGESTIONS`).
- **A subclass exists only from class level 3** (`SUBCLASS_MIN_LEVEL` in `character.ts`; true for every class in 2024). Below that the form locks the field and doesn't send its value, and the server rejects a subclass (`subclass-from-level.validator.ts`).
- The form (`CharacterForm/IdentitySection/ClassRow.tsx`) offers the class as a strict select and the subclass as an autocomplete: official subclasses are suggested, but homebrew or playtest names can be typed in.

`KnownSpell.class` in `character.ts` is still a free string; the form doesn't edit spells yet.

## Sources

| Code | Book                                                                 |
| ---- | -------------------------------------------------------------------- |
| PHB  | Player's Handbook (2024)                                             |
| FotA | Eberron: Forge of the Artificer (2025)                               |
| HoF  | Forgotten Realms: Heroes of Faerûn (2025)                            |
| RHW  | Ravenloft: The Horrors Within (2026)                                 |
| AU   | Arcana Unleashed (2026-09-15)                                        |
| DDB  | D&D Beyond Drop "Shadowfell Secrets" (2026-10, digital, subscribers) |

The PHB has 12 classes with 4 subclasses each (48). The Artificer is the 13th class and comes from FotA. With the other books that makes 77 subclasses, 76 of them in printed books.

## Classes and subclasses

A subclass marked "not in the app" is absent from `SUBCLASS_SUGGESTIONS`.

### Артефактор — Artificer (`artificer`, FotA)

| Subclass      | English      | Source |
| ------------- | ------------ | ------ |
| Алхимик       | Alchemist    | FotA   |
| Бронник       | Armorer      | FotA   |
| Артиллерист   | Artillerist  | FotA   |
| Боевой кузнец | Battle Smith | FotA   |
| Картограф     | Cartographer | FotA   |
| Реаниматор    | Reanimator   | RHW    |

### Варвар — Barbarian (`barbarian`)

| Subclass            | English                | Source |
| ------------------- | ---------------------- | ------ |
| Путь берсерка       | Path of the Berserker  | PHB    |
| Путь дикого сердца  | Path of the Wild Heart | PHB    |
| Путь Мирового древа | Path of the World Tree | PHB    |
| Путь фанатика       | Path of the Zealot     | PHB    |

### Бард — Bard (`bard`)

| Subclass            | English             | Source |
| ------------------- | ------------------- | ------ |
| Коллегия танца      | College of Dance    | PHB    |
| Коллегия очарования | College of Glamour  | PHB    |
| Коллегия знаний     | College of Lore     | PHB    |
| Коллегия доблести   | College of Valor    | PHB    |
| Коллегия луны       | College of the Moon | HoF    |
| Коллегия духов      | College of Spirits  | RHW    |

### Жрец — Cleric (`cleric`)

| Subclass        | English          | Source |
| --------------- | ---------------- | ------ |
| Домен жизни     | Life Domain      | PHB    |
| Домен света     | Light Domain     | PHB    |
| Домен обмана    | Trickery Domain  | PHB    |
| Домен войны     | War Domain       | PHB    |
| Домен знаний    | Knowledge Domain | HoF    |
| Домен упокоения | Grave Domain     | RHW    |
| Домен магии     | Arcana Domain    | AU     |

### Друид — Druid (`druid`)

| Subclass   | English            | Source |
| ---------- | ------------------ | ------ |
| Круг Земли | Circle of the Land | PHB    |
| Круг Луны  | Circle of the Moon | PHB    |
| Круг Моря  | Circle of the Sea  | PHB    |
| Круг Звёзд | Circle of Stars    | PHB    |

### Воин — Fighter (`fighter`)

| Subclass           | English         | Source               |
| ------------------ | --------------- | -------------------- |
| Мастер боя         | Battle Master   | PHB                  |
| Чемпион            | Champion        | PHB                  |
| Мистический рыцарь | Eldritch Knight | PHB                  |
| Пси-воин           | Psi Warrior     | PHB                  |
| Баннерет           | Banneret        | HoF                  |
| Чародейный стрелок | Arcane Archer   | AU                   |
| —                  | Sorrow Knight   | DDB (not in the app) |

### Монах — Monk (`monk`)

| Subclass             | English                    | Source |
| -------------------- | -------------------------- | ------ |
| Воин милосердия      | Warrior of Mercy           | PHB    |
| Воин тени            | Warrior of Shadow          | PHB    |
| Воин стихий          | Warrior of the Elements    | PHB    |
| Воин открытой ладони | Warrior of the Open Hand   | PHB    |
| Мистический воин     | Warrior of the Mystic Arts | AU     |

### Паладин — Paladin (`paladin`)

| Subclass                  | English                  | Source |
| ------------------------- | ------------------------ | ------ |
| Клятва преданности        | Oath of Devotion         | PHB    |
| Клятва славы              | Oath of Glory            | PHB    |
| Клятва древних            | Oath of the Ancients     | PHB    |
| Клятва возмездия          | Oath of Vengeance        | PHB    |
| Клятва благородных гениев | Oath of the Noble Genies | HoF    |

### Следопыт — Ranger (`ranger`)

| Subclass          | English       | Source |
| ----------------- | ------------- | ------ |
| Повелитель зверей | Beast Master  | PHB    |
| Странник фей      | Fey Wanderer  | PHB    |
| Сумрачный охотник | Gloom Stalker | PHB    |
| Охотник           | Hunter        | PHB    |
| Зимний ходок      | Winter Walker | HoF    |
| Страж пустошей    | Hollow Warden | RHW    |

### Плут — Rogue (`rogue`)

| Subclass           | English            | Source |
| ------------------ | ------------------ | ------ |
| Мистический ловкач | Arcane Trickster   | PHB    |
| Убийца             | Assassin           | PHB    |
| Клинок душ         | Soulknife          | PHB    |
| Вор                | Thief              | PHB    |
| Наследник троицы   | Scion of the Three | HoF    |
| Фантом             | Phantom            | RHW    |

### Чародей — Sorcerer (`sorcerer`)

| Subclass                | English            | Source |
| ----------------------- | ------------------ | ------ |
| Аберрантное чародейство | Aberrant Sorcery   | PHB    |
| Заводное чародейство    | Clockwork Sorcery  | PHB    |
| Драконье чародейство    | Draconic Sorcery   | PHB    |
| Дикая магия             | Wild Magic Sorcery | PHB    |
| Чаропламя               | Spellfire Sorcery  | HoF    |
| Теневое чародейство     | Shadow Sorcery     | RHW    |

### Колдун — Warlock (`warlock`)

| Subclass                    | English              | Source |
| --------------------------- | -------------------- | ------ |
| Покровитель Архифея         | Archfey Patron       | PHB    |
| Покровитель Небожитель      | Celestial Patron     | PHB    |
| Покровитель Исчадие         | Fiend Patron         | PHB    |
| Покровитель Великий древний | Great Old One Patron | PHB    |
| Покровитель Нежить          | Undead Patron        | RHW    |
| Покровитель Предтеча        | Vestige Patron       | AU     |

### Волшебник — Wizard (`wizard`)

| Subclass        | English     | Source |
| --------------- | ----------- | ------ |
| Оградитель      | Abjurer     | PHB    |
| Прорицатель     | Diviner     | PHB    |
| Воплотитель     | Evoker      | PHB    |
| Иллюзионист     | Illusionist | PHB    |
| Певец клинка    | Bladesinger | HoF    |
| Вызыватель      | Conjurer    | AU     |
| Очарователь     | Enchanter   | AU     |
| Некромант       | Necromancer | AU     |
| Преобразователь | Transmuter  | AU     |

## What is uncertain

- **Russian names are fan translations.** They come from next.dnd.su, which shows no English names or source books next to a subclass, so the RU↔EN pairs were matched by hand against the English list.
- **Wizard.** The next.dnd.su wizard page could not be read. Оградитель, Прорицатель and Воплотитель are confirmed by a Russian 2014-vs-2024 comparison; Иллюзионист, Певец клинка, Вызыватель, Очарователь, Некромант and Преобразователь are our own translations.
- **Страж пустошей = Hollow Warden** was matched by meaning, with no direct confirmation.
- **Sorrow Knight** has no Russian name yet and is subscriber-only, so the app doesn't suggest it.
- **Left out on purpose:** next.dnd.su also lists Бушующие в бою and Путь дикой магии (Barbarian), Воин пути змеи (Monk) and Космический покровитель (Warlock). No official 2024 list has them, so they look like playtest material or 2014 carry-overs.
- **Other classes on the Russian sites** are not official: Pugilist (D&D Beyond partner content), Blood Hunter, Mystic (Unearthed Arcana), the laserllama and Valda's Spire of Secrets classes.

## The 2014 edition

Not used by the app. The 2014 rules have the same 13 classes (the Artificer comes from Eberron: Rising from the Last War and Tasha's Cauldron of Everything) and 118 subclasses across the Player's Handbook, Xanathar's Guide to Everything, Tasha's Cauldron of Everything, Sword Coast Adventurer's Guide and the setting books. Per class: Artificer 4, Barbarian 9, Bard 8, Cleric 14, Druid 7, Fighter 10, Monk 10, Paladin 9, Ranger 8, Rogue 9, Sorcerer 8, Warlock 9, Wizard 13. The full roster is in the solorpgstudio census linked below.

## Links

- [next.dnd.su — классы 2024](https://next.dnd.su/class/) (Russian names; class pages are `/class/<key>`)
- [dungeonmister — all classes and subclasses in D&D 2024](https://dungeonmister.com/guides/classes-subclasses-in-dnd-2024/) (source book per subclass, updated 2026-10-04)
- [ENWorld — all 48 Player's Handbook 2024 subclasses](https://www.enworld.org/threads/all-48-player%E2%80%99s-handbook-2024-subclasses.704863/)
- [Wargamer — Arcana Unleashed subclasses](https://www.wargamer.com/dnd/arcana-unleashed-details)
- [dungeonsanddragonsfan — Ravenloft: The Horrors Within subclasses](https://dungeonsanddragonsfan.com/ravenloft-the-horrors-within-subclasses/)
- [ENWorld — Sorrow Knight in the D&D Beyond Drop](https://www.enworld.org/threads/d-d-beyond-drops-adds-first-subclass-a-shadowfell-themed-fighter.720854/)
- [vk — Волшебник 2014 и 2024](https://vk.ru/@dungeons_ru-sravnenie-klassov-volshebnik-2014-i-2024-goda-chto-novogo)
- [solorpgstudio — 5e subclasses 2014–2023](https://www.solorpgstudio.com/blog/state-of-dungeons-and-dragons-5e-subclasses-2014-2023/)
- [dnd.su — классы 2014](https://dnd.su/class/)
