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

### Unverified

- Fireball's header, components and duration lines, Cure Wounds and Hold Person's higher-level lines were read once through a page summary; the rest of the growth quotes are verbatim.
- The Russian «Cantrip Upgrade» heading and the ritual marker on a ritual spell page weren't read (next.dnd.su's spell list is rendered by a script).
- Sacred Flame's upgrade line wasn't confirmed.

## In the app

Decided with the user on 2026-10-17 ([plan/abilities.md](../plan/abilities.md), stage 6):

- **«Круг», not «уровень».** next.dnd.su 2024 writes «3 уровень», but the app keeps «круг» («Заговор», «3 круг, воплощение»), as in the spell slot cost («Ячейка заклинаний 3 круга»). That way a spell level isn't confused with the character level that cantrips grow with.
- **The level suggests the slot.** Choosing level N ticks the cost «Ячейка заклинаний N круга или выше»; the tick can be removed (a feat's free casting once per Long Rest: a copy of the spell with uses instead of a slot, until features can link to spells). A cantrip has no slot.
- **Components are one optional text field**, written as in the book: «В, С, М (бриллиант стоимостью не менее 300 ЗМ, расходуемый заклинанием)». Not split into V/S/M, a cost and consumption for now (decided with the user); the game will need that split later (silence, free hands, a focus or a pouch).
- **Duration is a field of the spell**, as the line in the book: Concentration belongs to the caster, and Moonbeam or a summon have no effect on a creature to carry it. Effects (stage 8) keep their own duration; for Hold Person both match.
- **Growth is a separate stage (7)** and lives on a step, not on the spell: Ice Knife grows only in step 2, and the Breath Weapon grows with character level without being a spell.

Code: `packages/shared/src/abilitySpell.ts` (`SpellDetails`, `isSpellDetails`, `spellSlotFits`) and `abilitySpellLabels.ts` (school names, «3 круг, воплощение», the duration line); the server checks the slot in `apps/server/src/abilities/dto/spell-slot.validator.ts`; the form is `apps/web/src/features/simpleCatalog/SpellFields/`.
