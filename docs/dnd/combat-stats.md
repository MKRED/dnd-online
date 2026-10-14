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

## Links

- [D&D Beyond free rules — Creating a Character](https://www.dndbeyond.com/sources/dnd/free-rules/creating-a-character)
- [dungeonmister — hit points in D&D 2024](https://dungeonmister.com/guides/rules/hit-points-dnd-2024/)
