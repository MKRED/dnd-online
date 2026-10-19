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

The decisions are in [plan/monsters-npcs.md](../plan/monsters-npcs.md) («Решения»). Code doesn't exist yet. When it lands, this section will say where the data lives and where the app departs from the book. Planned so far:

- **The GM enters every number by hand**, as in the book, including the saves, skills, initiative and the average HP. The app doesn't derive them. XP and PB are read from the CR table above.
- **A «Монстра» ability category** carries the Trait and Legendary Action activations and the Recharge cost.
- **Monster spells** have a per-day limit stored on the monster's link to the spell. Monsters don't get spell slots.
- **The "unique" role is the app's own idea**, not the book's: only one copy of such a monster can be on a scene.
