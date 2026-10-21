# Combat stats on the character sheet

Reference for the derived and hand-entered combat numbers of the character sheet (2024 edition). Researched on 2026-10-14.

## Initiative

- **Rule:** "Write your Dexterity modifier in the space for Initiative on your character sheet" (free rules, Creating a Character).
- **In the app:** not stored. The form shows it read-only in «Боевые параметры» as the Dexterity modifier and updates it as Dexterity changes (`CharacterForm/CombatSection.tsx`, formula in `AbilityScoresSection/abilityMath.ts`).
- **Departure from the book:** features that add to Initiative (the Alert feat is the usual example) are not counted, and there is no field for an extra bonus. The Alert text was not checked.

## Hit die

- **Rule:** the class sets the die type of the Hit Point Dice; a character has one die per level, and a multiclass character pools the dice of all classes (free rules, Creating a Character).
- **In the app (decided with the user on 2026-10-14):** the player picks the die by hand, independently of the class. It is one required value, к6, к8, к10 or к12.
  - `packages/shared/src/character.ts` — `HIT_DICE` and `Character.hitDie` (the number of sides). The column is nullable only for characters created before the field existed: they have `null` until their next edit, where the form makes the player pick a die.
  - `apps/server/src/characters/dto/create-character.dto.ts` — the server requires it and rejects any other number.
  - `CharacterForm/CombatSection.tsx` — the select «Кость хитов».
- **Departures from the book:** the die is not derived from the class, a multiclass character can record only one die type, and the number of dice (total and spent) is not tracked.

For reference, the die per class. The app does not use this table.

| Die | Classes                                              |
| --- | ---------------------------------------------------- |
| d12 | Barbarian                                            |
| d10 | Fighter, Paladin, Ranger                             |
| d8  | Artificer, Bard, Cleric, Druid, Monk, Rogue, Warlock |
| d6  | Sorcerer, Wizard                                     |

**Unverified:** the table comes from the dungeonmister summary, not from each class page. The free rules confirm only the level 1 hit points (Barbarian 12, Fighter, Paladin and Ranger 10) and that Fighter and Paladin share a d10.

## Proficiency bonus

Researched on 2026-10-20.

- **Rule:** a character's proficiency bonus grows with the character level from +2 to +6 (levels 1–20, free rules, Creating a Character). A monster's comes from its Challenge Rating and reaches +9 at CR 29–30 (the table in [monsters.md](monsters.md); e.g. the Aspect of Bahamut, CR 30, +9, Fizban's Treasury of Dragons, [dnd.su](https://5e14.dnd.su/bestiary/5524-aspect-of-bahamut/)).
- **In the app (decided on 2026-10-20, when the user built an NPC from the Aspect of Bahamut):** the bonus is entered by hand and not derived from the level. One range, 2 to 9, for player characters and NPCs alike, so an NPC copied from a monster's stat block fits.
  - `packages/shared/src/character.ts` — `PROFICIENCY_BONUS_MIN` and `PROFICIENCY_BONUS_MAX`.
  - `apps/server/src/characters/dto/create-character.dto.ts` — the server accepts an integer in that range.
  - `CharacterForm/CombatSection.tsx` and `CharacterForm.tsx` — the field «Бонус мастерства» and its check.
- **Departure from the book:** a player character can be given +7 to +9 too. The form doesn't tie the range to the kind: a PUT without a kind keeps the stored one, so the server can't always tell which limit applies.

## Heroic Inspiration

Researched on 2026-10-17 in the free rules (Playing the Game, the Heroic Inspiration sidebar; Character Origins, Human).

- **Rule:** "If you have Heroic Inspiration, you can expend it to reroll any die immediately after rolling it, and you must use the new roll." "Only One at a Time. You can never have more than one instance of Heroic Inspiration." A second one can be given to a player character in the group who lacks it.
- **Gaining it:** the DM gives it (usually for something heroic, in character or entertaining), or a rule does. The Human trait Resourceful: "You gain Heroic Inspiration whenever you finish a Long Rest."
- **In the app (house rule, decided with the user on 2026-10-17):** a count from 0 to 50 instead of "have it or not". The cap only catches typos.
  - `packages/shared/src/character.ts` — `HEROIC_INSPIRATION_MAX` and `Character.heroicInspiration`.
  - `apps/server/src/characters/dto/` — both DTOs accept an integer from 0 to 50. Migration `0026_heroic_inspiration_count.sql` turned the old checkbox into 1 or 0.
  - `CharacterForm/CombatSection.tsx` — the number field «Героическое вдохновение»; `CharacterSheet/SheetHeader.tsx` — the badge «Героическое вдохновение: N» when it is above 0.
- **Departures from the book:** more than one at a time, by the house rule above. The app does not grant it on its own (Resourceful after a Long Rest) and does not spend it on a reroll; the player changes the number in the form.

## Passive Perception

Researched on 2026-10-21 in the free rules (Rules Glossary, «Passive Perception»).

- **Rule:** "A creature's Passive Perception equals 10 plus the creature's Wisdom (Perception) check bonus. If the creature has Advantage on such checks, increase the score by 5. If the creature has Disadvantage on them, decrease the score by 5." The check bonus is the Wisdom modifier plus the proficiency bonus with Perception proficiency, twice the bonus with Expertise.
- **In the app:** not stored, computed for the sheet tile «Пассивное восприятие» (`CharacterSheet/sheetPerception.ts`).
  - `packages/shared/src/passivePerception.ts` — `passivePerceptionBase` (10 + Wisdom + proficiency) and `perceptionShift` (the effects).
  - The effects counted: an «Преимущество или помеха» component without a «когда» condition on ability checks of Wisdom or of all abilities, or on all D20 Tests, gives +5 or −5 (Poisoned through its condition gives −5). Advantage and Disadvantage together cancel out, as on a roll. A «Бонус к броску» on such checks adds its number (Enthrall's −10 written as a penalty of 10).
  - The tile is highlighted when effects change the number, and its tooltip names them, as on Speed and Armor Class.
- **Unverified / departures:**
  - A die bonus (Guidance's 1d4) isn't added: a die is not a fixed bonus, and the rules don't say how a die adds to a passive score.
  - Cancelling Advantage and Disadvantage is the rule for rolls; the glossary entry doesn't say what happens to the score when both apply. The app treats it the same way.
  - Conditional Advantage («when the source is in sight», Frightened) isn't counted: the sheet doesn't know the situation.

## Death Saving Throws

Researched on 2026-10-21 in the free rules (Playing the Game, «Dropping to 0 Hit Points»).

- **Rule:** "Whenever you start your turn with 0 Hit Points, you must make a Death Saving Throw … Roll 1d20. If the roll is 10 or higher, you succeed. Otherwise, you fail." "On your third success, you become Stable … On your third failure, you die." "The successes and failures don't need to be consecutive … The number of both is reset to zero when you regain any Hit Points or become Stable." A roll of 1 counts as two failures, a 20 restores 1 Hit Point; damage at 0 Hit Points is a failure (two from a Critical Hit), and damage equal to the Hit Point maximum kills.
- **In the app:** the sheet stores the counts (`Character.deathSaveSuccesses` and `deathSaveFailures`, 0–3) and shows them as three circles each on the tile «Спасброски от смерти» (`CharacterSheet/DeathSavesTile.tsx`). The rolls themselves are made at the table; changing the counts in play comes with the game's creature state ([plan/game.md](../plan/done/game.md), stage 8).

## Links

- [D&D Beyond free rules — Creating a Character](https://www.dndbeyond.com/sources/dnd/free-rules/creating-a-character)
- [D&D Beyond free rules — Playing the Game](https://www.dndbeyond.com/sources/dnd/free-rules/playing-the-game)
- [D&D Beyond free rules — Rules Glossary](https://www.dndbeyond.com/sources/dnd/free-rules/rules-glossary)
- [D&D Beyond free rules — Character Origins](https://www.dndbeyond.com/sources/dnd/free-rules/character-origins)
- [dungeonmister — hit points in D&D 2024](https://dungeonmister.com/guides/rules/hit-points-dnd-2024/)
