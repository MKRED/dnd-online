# Spells

Reference for the fields of a spell (2024 edition): level, school, components, ritual, duration, and how spells grow with a higher slot or the character's level. Researched on 2026-10-17.

How a spell hits (attack rolls, saves, areas, several steps) is in [attacks-and-saves.md](attacks-and-saves.md). Casting time and the spell slot cost are in [ability-usage.md](ability-usage.md). Duration forms and Concentration are in [durations.md](durations.md).

## Sources

- D&D Beyond, Free Rules (2024), «Spells» (https://www.dndbeyond.com/sources/dnd/free-rules/spells);
- «Spell Descriptions» (https://www.dndbeyond.com/sources/dnd/free-rules/spell-descriptions);
- «Character Origins», Dragonborn (https://www.dndbeyond.com/sources/dnd/free-rules/character-origins);
- next.dnd.su, Russian wording: «Механика заклинаний» (https://next.dnd.su/mechanics/spellcasting), the glossary (https://next.dnd.su/glossary/), the spell pages for Magic Missile (`/spells/10567-magic-missile`) and Revivify (`/spells/10299-revivify`).

## Rule

### Level

- "Every spell has a level from 0 to 9." "Cantrips… are level 0."
- "When you cast a spell, you expend a slot of that spell's level or higher." With a higher slot "the spell takes on the higher level for that casting".
- Cantrips and Ritual casting use no slot.

### Schools

"Schools… have no rules of their own." They are a label, which some features refer to.

| Key             | English       | Russian (next.dnd.su) | Typical effects (book)                                       |
| --------------- | ------------- | --------------------- | ------------------------------------------------------------ |
| `abjuration`    | Abjuration    | Ограждение            | Prevents or reverses harmful effects                         |
| `conjuration`   | Conjuration   | Призыв                | Transports creatures or objects                              |
| `divination`    | Divination    | Прорицание            | Reveals information                                          |
| `enchantment`   | Enchantment   | Очарование            | Influences minds                                             |
| `evocation`     | Evocation     | Воплощение            | Channels energy to create effects that are often destructive |
| `illusion`      | Illusion      | Иллюзия               | Deceives the mind or senses                                  |
| `necromancy`    | Necromancy    | Некромантия           | Manipulates life and death                                   |
| `transmutation` | Transmutation | Преобразование        | Transforms creatures or objects                              |

The 2014 translation on dnd.su called Conjuration «Вызов». The app follows next.dnd.su, which uses «Призыв».

### Components

- "Each spell's description indicates whether it requires Verbal (V), Somatic (S), or Material (M) components." Without one, "the spellcaster can't cast the spell."
- Verbal: "uttered in a normal speaking voice". Somatic: "must use at least one of their hands". Material: needs a free hand, which may be the somatic one.
- "These materials aren't consumed by the spell unless the spell's description states otherwise."
- "If a spell doesn't consume its materials and doesn't specify a cost for them," a Component Pouch or a Spellcasting Focus can stand in for them.
- In a spell block the materials are written in brackets: "V, S, M (a ball of bat guano and sulfur)" (Fireball), "V, S, M (a pearl worth 100+ GP)" (Identify, with a cost, not consumed), "which the spell consumes" (Gentle Repose).
- Russian (next.dnd.su): «Компоненты: В, С, М (бриллиант стоимостью не менее 300 ЗМ, расходуемый заклинанием)» (Revivify). В = вербальный, С = соматический, М = материальный. The site prints the С as a Latin C; the glossary has the Cyrillic letter, and the app uses that one.
- **Unclear in the book:** whether a pouch or focus can replace a material that has a cost but isn't consumed. Only the case without a cost and without consumption is stated.

### Ritual

- "Certain spells have the Ritual tag in the Casting Time entry": "Action or Ritual" (Detect Magic), "1 minute or Ritual" (Identify).
- Ritual casting "takes 10 minutes longer to cast than normal, but it doesn't expend a spell slot". "To cast a spell as a Ritual, a spellcaster must have it prepared."
- Russian: «У некоторых заклинаний Время сотворения имеет метку Ритуал»; abbreviation «Р».

### Duration

The forms are in [durations.md](durations.md): Instantaneous, a time span (rounds to days), "Concentration, up to …", "Until dispelled", "Until dispelled or triggered", "Special". Russian: «Длительность: Мгновенная», «Концентрация». The «вплоть до» wording was not found on the pages read.

### Spell block

The book prints a header line, then Casting Time, Range, Components, Duration, the text, then the growth paragraph:

- Fire Bolt: "Evocation Cantrip (Sorcerer, Wizard)", Action, 120 feet, V, S, Instantaneous.
- Fireball: "Level 3 Evocation (Sorcerer, Wizard)", Action, 150 feet, "V, S, M (a ball of bat guano and sulfur)", Instantaneous.
- Hold Person: "Concentration, up to 1 minute".
- Russian header: «1 уровень, Воплощение» (next.dnd.su; field labels «Время сотворения», «Дистанция», «Компоненты», «Длительность»).

Targets and areas aren't fields of their own; they are in the text.

### Growth

- **Higher slot**, the paragraph "Using a Higher-Level Spell Slot" (Russian heading on next.dnd.su: «Используя ячейку заклинания большего уровня»):
  - Fireball: "The damage increases by 1d6 for each spell slot level above 3."
  - Ice Knife: "The Cold damage increases by 1d6 for each spell slot level above 1." Only the save damage of the second part grows, not the attack's Piercing damage.
  - Scorching Ray: "You create one additional ray for each spell slot level above 2." Magic Missile: "The spell creates one more dart for each spell slot level above 1."
  - Cure Wounds: "The healing increases by 2d8 for each spell slot level above 1."
  - Hold Person: "You can target one additional Humanoid for each spell slot level above 2."
- **Cantrip Upgrade**, by character level:
  - Fire Bolt: "The damage increases by 1d10 when you reach levels 5 (2d10), 11 (3d10), and 17 (4d10)."
  - Eldritch Blast: "The spell creates two beams at level 5, three beams at level 11, and four beams at level 17… Make a separate attack roll for each beam."
  - Shillelagh changes the die size ("levels 5 (d10), 11 (d12), and 17 (2d6)"); Spare the Dying doubles its range.
- **Not only spells:** the Dragonborn Breath Weapon "damage increases by 1d10 when you reach character levels 5 (2d10), 11 (3d10), and 17 (4d10)".

Checked again on 2026-10-17 for stage 7 (free rules, https://www.dndbeyond.com/sources/dnd/free-rules/spell-descriptions, https://www.dndbeyond.com/sources/dnd/free-rules/character-classes, https://www.dndbeyond.com/sources/dnd/br-2024/character-origins; the pages were read through a fetch model's summary and quotes, not as raw text):

- **Slot growth is always per one slot level** in every spell checked: Spiritual Weapon "1d8 for every slot level above 2", Flame Blade (1d6 above 2), Spirit Guardians (1d8 above 3), Vampiric Touch (1d6 above 3), Moonbeam (1d10 above 2), Call Lightning (1d10 above 3). The 2014 "every two slot levels" is gone from these; the whole spell list wasn't scanned for it.
- **The level "above X" is the spell's own level** in every quote, so it isn't a separate number.
- **Flat numbers** grow only in healing and Temporary Hit Points: False Life "5 additional Temporary Hit Points for each spell slot level above 1", Heal "The healing increases by 10 for each spell slot level above 6". Fog Cloud grows its radius ("20 feet for each spell slot level above 1").
- **Cantrips:** Sacred Flame "increases by 1d8 when you reach levels 5 (2d8), 11 (3d8), and 17 (4d8)"; no cantrip with other levels was found (Fire Bolt, Eldritch Blast, Sacred Flame checked).
- **A feature that grows with the slot:** the Warlock invocation Eldritch Smite (Level 5+ Warlock, Pact of the Blade) — "you can expend a Pact Magic spell slot to deal an extra 1d8 Force damage to the target, plus another 1d8 per level of the spell slot". It isn't a spell, so slot growth belongs to the slot cost, not to the spell category.
- **Class-level growth has its own tables**, not 5/11/17: Sneak Attack "increases as you gain Rogue levels" (1d6 at 1, +1d6 at 3, 5, 7, …, 19 — 10d6), Barbarian Rage Damage +2, +3 at level 9, +4 at level 16.

Checked on 2026-10-18 for the examples of the ability form guide (free rules, https://www.dndbeyond.com/sources/dnd/free-rules/spell-descriptions and https://www.dndbeyond.com/sources/dnd/free-rules/character-origins; verbatim page text through a fetch agent):

- Fire Bolt: "Evocation Cantrip", Action, 120 feet, V, S, Instantaneous.
- Fireball: "Level 3 Evocation", Action, 150 feet, Instantaneous.
- Ice Knife: "Level 1 Conjuration", Action, 60 feet, "S, M (a drop of water or a piece of ice)", Instantaneous.
- Magic Missile: "Level 1 Evocation", Action, 120 feet, V, S, Instantaneous; "A dart deals 1d4 + 1 Force damage to its target."
- Scorching Ray: Action, 120 feet, "Make a ranged spell attack for each ray. On a hit, the target takes 2d6 Fire damage."
- Dragonborn Breath Weapon: as quoted in [attacks-and-saves.md](attacks-and-saves.md); uses "equal to your Proficiency Bonus", regained "when you finish a Long Rest".

The guide's examples live in `apps/web/src/features/simpleCatalog/AbilityGuide/guideExamples.ts`. They leave the components empty: there is no Russian book wording at hand for them.

### Unverified

- Fireball's header, components and duration lines, Cure Wounds and Hold Person's higher-level lines were read once through a page summary; the rest of the growth quotes are verbatim.
- The Russian «Cantrip Upgrade» heading and the ritual marker on a ritual spell page weren't read (next.dnd.su's spell list is rendered by a script).
- Shadow Blade, Toll the Dead and Armor of Agathys aren't in the free rules and weren't checked against the 2024 book.

## In the app

Decided with the user on 2026-10-17 ([plan/done/abilities.md](../plan/done/abilities.md), stage 6):

- **«Круг», not «уровень».** next.dnd.su 2024 writes «3 уровень», but the app keeps «круг» («Заговор», «3 круг, воплощение»), as in the spell slot cost («Ячейка заклинаний 3 круга»). That way a spell level isn't confused with the character level that cantrips grow with.
- **The level suggests the slot.** Choosing level N ticks the cost «Ячейка заклинаний N круга или выше»; the tick can be removed (a feat's free casting once per Long Rest: a copy of the spell with uses instead of a slot, until features can link to spells). A cantrip has no slot.
- **Components are one optional text field**, written as in the book: «В, С, М (бриллиант стоимостью не менее 300 ЗМ, расходуемый заклинанием)». Not split into V/S/M, a cost and consumption for now (decided with the user); the game will need that split later (silence, free hands, a focus or a pouch).
- **Duration is a field of the spell**, as the line in the book: Concentration belongs to the caster, and Moonbeam or a summon have no effect on a creature to carry it. Effects (stage 8) keep their own duration; for Hold Person both match.
- **Growth is a separate stage (7)** and lives on a step, not on the spell: Ice Knife grows only in step 2, and the Breath Weapon grows with character level without being a spell.

Stage 7 (planned 2026-10-17, built 2026-10-18):

- **What a step grows by is not stored; the ability decides it.** With the cost «Ячейка заклинаний N круга или выше» — per slot circle above N (Fireball, Eldritch Smite with a slot of circle 1 and 2d8 as the base). Without it — at character levels 5, 11 and 17 (cantrips, the Breath Weapon). A spell of circle 1+ without a slot (a feat's copy) doesn't grow: it's cast at its own circle. **App rule, not the book:** the book has no ability that grows both ways.
- **Growth is extra damage rows plus extra repeats per increment**, the rows the same as damage rows (dice, number, type; decided with the user — the type can differ from the base, flat numbers come free).
- **Code:** `packages/shared/src/abilityStepGrowth.ts` (`growthBasis`), `abilityStepGrowthLabels.ts`, the check in `abilityStepDamageCheck.ts`; the form block is `apps/web/src/features/simpleCatalog/StepsField/GrowthFields.tsx`.
- **Left out:** class-level growth (Sneak Attack, Rage Damage — needs the character's class level), more targets (Hold Person), a different die (Shillelagh), range (Spare the Dying), healing and Temporary Hit Points (with effects).

Code: `packages/shared/src/abilitySpell.ts` (`SpellDetails`, `isSpellDetails`, `spellSlotFits`) and `abilitySpellLabels.ts` (school names, «3 круг, воплощение», the duration line); the server checks the slot in `apps/server/src/abilities/dto/spell-slot.validator.ts`; the form is `apps/web/src/features/simpleCatalog/SpellFields/`.
