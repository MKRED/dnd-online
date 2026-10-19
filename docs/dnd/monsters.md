# Monster stat blocks

Reference for the 2024 monster stat block: its parts, the usage limits of monster abilities, sizes, creature types and the Challenge Rating tables. Researched on 2026-10-19 for block 2 of the roadmap ([plan/monsters-npcs.md](../plan/monsters-npcs.md)).

## Sources

D&D Beyond replaced the Free Rules (2024) with the Basic Rules (2024); the old `free-rules/monsters` address answers 404.

- «How to Use a Monster»: https://www.dndbeyond.com/sources/dnd/br-2024/how-to-use-a-monster
- «Creature Stat Blocks» (Aboleth, Ancient Black Dragon, Air Elemental, Cloaker, Deva, Commoner…): https://www.dndbeyond.com/sources/dnd/br-2024/creature-stat-blocks/. Only about the first 60% of the page was read.
- Rules Glossary: https://www.dndbeyond.com/sources/dnd/br-2024/rules-glossary
- The stat block preview article: https://www.dndbeyond.com/posts/1890-preview-the-new-stat-block-design-in-the-2024
- Russian terms: https://next.dnd.su/glossary/ and the Aboleth, https://next.dnd.su/bestiary/21155-aboleth/

The SRD 5.2 PDF couldn't be read. The fetch tool gave summaries with short quotes, so some wording below is a close paraphrase.

## The stat block

«How to Use a Monster» names eight parts, in this order.

1. **Name and header.** The header is one line, «Large Aberration, Lawful Evil»: size, creature type with optional tags in parentheses, alignment.
   - Tags have no rules of their own; other effects may refer to them.
   - The alignment is a roleplaying default.
   - Where the block offers several sizes, the GM picks one.
2. **Combat highlights:**
   - **Armor Class** already includes natural armor, Dexterity, gear and other defenses.
   - **Initiative** is written «Initiative +7 (17)»: the modifier, then the score for a GM who doesn't roll.
     - The score is 10 + the modifier.
     - The modifier is "typically" the Dexterity modifier, not always.
   - **Hit Points** are written as the average and the dice, e.g. «150 (20d10 + 40)».
     - The die is set by size, and the Constitution modifier is added once per die.
     - Example: the Large Aboleth with Con 15 (+2) has 20 × 5.5 + 40 = 150.
   - **Speed** is the walking speed plus special speeds: Burrow, Climb, Fly, Swim. Hover is written in parentheses after Fly: «Fly 90 ft. (hover)».
3. **Ability table:** Score, Mod and Save for each of the six abilities.
   - Every ability has a Save value. Without proficiency it equals the modifier.
   - With proficiency it appears to be modifier + PB. That is an inference from the blocks; no rule text quoting it was found.
4. **Details**, each line only when the monster has it:
   - **Skills:** «Perception +4, Stealth +7» — the ability modifier + PB, plus other bonuses.
   - **Vulnerabilities:** damage types.
   - **Resistances:** damage types.
   - **Immunities:** one line, damage types, then a semicolon, then conditions. Example: «Poison, Thunder; Exhaustion, Grappled, Paralyzed…».
   - **Gear:** «Light Crossbow, Shortsword, Studded Leather Armor».
     - It lists only the equipment that "can be given away or retrieved".
     - Gear named outside this line is supernatural and unusable once the monster is defeated.
     - The monster is proficient with its gear, and ammunition is implied.
   - **Senses:** «Blindsight 60 ft., Darkvision 120 ft.; Passive Perception 26». Passive Perception always comes last, after a semicolon.
   - **Languages:** a list («Common, Draconic»), telepathy after a semicolon («Deep Speech; telepathy 120 ft.»), «Understands Common but can't speak», or «None».
   - **CR:** «CR 10 (XP 5,900, or 7,200 in lair; PB +4)». The in-lair XP appears only when the monster has a lair.
5. **Traits** — features that always work or work in certain situations.
6. **Actions**, including Multiattack.
   - Multiattack lists the attacks made with one Attack action: «The dragon makes three Rend attacks».
   - An attack is written «Melee Attack Roll: +9, reach 15 ft. Hit: 12 (2d6 + 5) Bludgeoning damage.»
   - A save is written «Dexterity Saving Throw: DC 22, each creature in a 90-foot-long, 10-foot-wide Line. Failure: … Success: Half damage.»
7. **Bonus Actions.**
8. **Reactions** (each states its trigger) and **Legendary Actions**.

## Usage limits

- **X/Day** is written in the name: «Phantasmal Killer (1/Day)». The uses return on a Long Rest.
- **Recharge X–6:** «Acid Breath (Recharge 5–6)». The ability works once. At the start of each of the monster's turns it rolls 1d6, and on a result in the range the ability is back. The blocks read had 4–6 and 5–6. It also comes back after a Short or Long Rest.
- **Recharge after a Short or Long Rest:** «Phantasms (Recharge after a Short or Long Rest)». The ability works once and needs a rest to return.
- **Legendary Resistance (3/Day, or 4/Day in Lair):** a failed save becomes a success.
- **Legendary Actions:** «Legendary Action Uses: 3 (4 in Lair).»
  - The monster takes them one at a time, only right after another creature's turn.
  - Every legendary action costs exactly one use; the 2024 preview article says none cost more.
  - **2014 books differ in cost only.** The Aspect of Bahamut (Fizban's Treasury of Dragons, https://dnd.su/bestiary/5524-aspect-of-bahamut/, read 2026-10-19) has 3 legendary actions that it «восстанавливает … в начале своего хода», the same per-round reset as 2024. But «Яростный укус» there «стоит 2 действия», and its Mythic Actions cost 2 or 3.
  - Spent uses return at the start of the monster's turn.
  - A monster that is Incapacitated or otherwise can't act can't take them.
- **Spellcasting** is an action: «The dragon casts one of the following spells, requiring no Material components…».
  - It states the spellcasting ability, the save DC and the attack bonus.
  - It lists the spells under «At Will:», «1/Day Each:» or «2/Day Each:».
  - A spell of level 1 or higher is cast at its lowest level unless the block says otherwise.
  - Monsters don't use spell slots.

## Sizes and creature types

Sizes, with the Hit Point die and its average:

| Size       | Russian   | HP die | Average per die |
| ---------- | --------- | ------ | --------------- |
| Tiny       | Крошечный | d4     | 2.5             |
| Small      | Маленький | d6     | 3.5             |
| Medium     | Средний   | d8     | 4.5             |
| Large      | Большой   | d10    | 5.5             |
| Huge       | Огромный  | d12    | 6.5             |
| Gargantuan | Громадный | d20    | 10.5            |

The 14 creature types:

| Type        | Russian    |
| ----------- | ---------- |
| Aberration  | Аберрация  |
| Beast       | Зверь      |
| Celestial   | Небожитель |
| Construct   | Конструкт  |
| Dragon      | Дракон     |
| Elemental   | Элементаль |
| Fey         | Фея        |
| Fiend       | Исчадие    |
| Giant       | Великан    |
| Humanoid    | Гуманоид   |
| Monstrosity | Чудовище   |
| Ooze        | Слизь      |
| Plant       | Растение   |
| Undead      | Нежить     |

**Unverified:** the Russian type names come from a search summary of the next.dnd.su glossary; the glossary page itself wasn't read. Fiend, Monstrosity, Ooze and Celestial were checked against bestiary examples.

## Challenge Rating

CR runs from 0 to 30, with the fractions 1/8, 1/4 and 1/2. The glossary describes it as the threat the monster poses to a group of four player characters.

| CR  | XP      | PB  |     | CR  | XP      | PB  |
| --- | ------- | --- | --- | --- | ------- | --- |
| 0   | 0 or 10 | +2  |     | 15  | 13,000  | +5  |
| 1/8 | 25      | +2  |     | 16  | 15,000  | +5  |
| 1/4 | 50      | +2  |     | 17  | 18,000  | +6  |
| 1/2 | 100     | +2  |     | 18  | 20,000  | +6  |
| 1   | 200     | +2  |     | 19  | 22,000  | +6  |
| 2   | 450     | +2  |     | 20  | 25,000  | +6  |
| 3   | 700     | +2  |     | 21  | 33,000  | +7  |
| 4   | 1,100   | +2  |     | 22  | 41,000  | +7  |
| 5   | 1,800   | +3  |     | 23  | 50,000  | +7  |
| 6   | 2,300   | +3  |     | 24  | 62,000  | +7  |
| 7   | 2,900   | +3  |     | 25  | 75,000  | +8  |
| 8   | 3,900   | +3  |     | 26  | 90,000  | +8  |
| 9   | 5,000   | +4  |     | 27  | 105,000 | +8  |
| 10  | 5,900   | +4  |     | 28  | 120,000 | +8  |
| 11  | 7,200   | +4  |     | 29  | 135,000 | +9  |
| 12  | 8,400   | +4  |     | 30  | 155,000 | +9  |
| 13  | 10,000  | +5  |     |     |         |     |
| 14  | 11,500  | +5  |     |     |         |     |

**Lair.** A lair shows up in three places: the in-lair XP, the in-lair Legendary Resistance uses and the in-lair Legendary Action uses. Lair actions and regional effects are described elsewhere («Running Lairs»), which wasn't read.

**Unique monsters.** The 2024 rules read have no notion of a "unique" monster or a boss. next.dnd.su's «именной НИП» is a site filter, not a rules term.

## In the app

The decisions are in [plan/monsters-npcs.md](../plan/monsters-npcs.md) («Решения»).

**Built (stage 2, 2026-10-19): the «Монстра» ability category.**

- The category `monster` sits next to «Базовая» and «Заклинание» in the shared ability catalog.
- Only it may use the activations **«Черта»** (`{ kind: 'trait' }`, no fields; conditions go in the description) and **«Легендарное действие»** (`{ kind: 'legendary', cost }`, cost 1–3). Any other category with them gets 400. A stored record that breaks this reads as «Действие».
- **Recharge** is the category's own field in `details`: `{ recharge: X | null }`, X from 2 to 6, shown as «Перезарядка 5–6» or «Перезарядка 6» in the costs row. It isn't one of the shared costs: their key set is strict, and a new key would make every stored ability fail the check.
- **X/Day** and **Recharge after a rest** need no new fields: they are uses that come back after a Long Rest, or one use that comes back after a Short or Long Rest.
- **A character can't take a «Монстра» ability:** the add dialog doesn't offer one, and the server answers 400. An ability that becomes «Монстра» after it was added stays on the sheet, grouped by its activation.
- Code: `packages/shared/src/abilityMonster.ts` (category fields, the category check, the recharge label); the activations are in `abilityUsage.ts` and `abilityUsageLabels.ts`. The form fields are in `apps/web/src/features/simpleCatalog/MonsterAbilityFields.tsx` and `UsageField/ActivationFields.tsx`.

**Built (stage 3, 2026-10-19): the monster catalog on the server** (`/monsters`).

- **Category** is the creature type, one of the 14 above (`MONSTER_TYPES`). **Role** is `regular` or `unique`.
- **The stat block** (`MonsterStatBlock`) holds the parts of the book's block as the GM enters them:
  - size, tags and alignment as text;
  - AC, the Initiative modifier;
  - Hit Points as the average and the dice `{ count, die, bonus }`;
  - speeds: walk, plus burrow, climb, fly and swim (`null` when absent), and hover, allowed only with a fly speed;
  - each ability as `{ score, save }`;
  - skills with their bonus, each skill once;
  - vulnerabilities, resistances and immunities from the 13 damage types, condition immunities from the 15 conditions, each unique within its list;
  - senses from the effect sense kinds, each once, and Passive Perception;
  - languages as text;
  - CR as a string key (`'0'`, `'1/8'`, `'1/4'`, `'1/2'`, `'1'`…`'30'`);
  - optional in-lair XP, Legendary Action uses and in-lair uses (the in-lair count only with the regular one);
  - spellcasting `{ ability, saveDc, attackBonus }`, each optional.
- **XP and PB come from the CR table** (`challengeXp`, `challengeProficiencyBonus`). For CR 0 the book gives «0 or 10» (10 when the monster has an effective attack); the table holds 0 until the card decides how to show it.
- **The limits are the app's, not the book's**, set with room above the largest 2024 monsters:
  - AC 1–50;
  - bonuses (initiative, saves, skills, spell attack) −10…+30;
  - ability scores 1–30;
  - HP average 1–9999, up to 999 dice of d4/d6/d8/d10/d12/d20;
  - speeds up to 300 ft in steps of 5;
  - Passive Perception 0–50, save DC 1–40;
  - Legendary Action uses 1–10;
  - tags up to 100 characters, alignment up to 30, languages up to 300.
- Code: `packages/shared/src/monsters.ts` (types, sizes, roles, the default stat block), `monsterChallenge.ts`, `monsterStatBlockCheck.ts`; server `apps/server/src/monsters/`.

Planned for the next stages:

- **The GM enters every number by hand**, as in the book, including the saves, skills, initiative and the average HP. The app doesn't derive them. XP and PB are read from the CR table above.
- **Monster spells** have a per-day limit stored on the monster's link to the spell. Monsters don't get spell slots. Spellcasting is not an ability: the monster has optional spellcasting ability, save DC and spell attack fields, shown in the «Заклинания» header.
- **A legendary action has a cost of 1–3**, default 1 (built in stage 2). The 2024 book always costs 1. The cost is kept for monsters taken from 2014 books.
- **The "unique" role is the app's own idea**, not the book's: only one copy of such a monster can be on a scene.
