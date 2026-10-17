# Combining effects

How the 2024 rules combine several effects on one creature: different spells, the same spell twice, conditions, and things that happen at the same time. Needed for the rules engine that will compute effects on the map ([plan/effects-coverage.md](../plan/effects-coverage.md)). Researched on 2026-10-16.

## Sources

- D&D Beyond, Free Rules (2024), «Spells», «Combining Spell Effects» (https://www.dndbeyond.com/sources/dnd/free-rules/spells), read word for word.
- «Rules Glossary» (https://www.dndbeyond.com/sources/dnd/free-rules/rules-glossary): Condition, Exhaustion, Concentration, Resistance, Vulnerability, Simultaneous Effects, Speed, Shape-Shifting, read word for word.

## Rule

- **Different spells add up:** «The effects of different spells add together while their durations overlap.»
- **The same spell doesn't:** «the effects of the same spell cast multiple times don't combine. Instead, the most potent effect—such as the highest bonus—from those castings applies while their durations overlap.» If they are equally potent, the most recent applies. Two Bless on one target give one 1d4, and the benefit lasts until the later Bless ends.
- **A condition doesn't stack with itself** (a creature has it or doesn't). Exhaustion is the exception: «This condition is cumulative.»
- **Resistance and Vulnerability** apply only once to an instance of damage.
- **Concentration:** starting another spell or effect that needs Concentration ends the previous one.
- **Simultaneous effects:** «If two or more things happen at the same time on a turn, the person at the game table—player or DM—whose turn it is decides the order».
- **Speed:** a change to Speed changes every special speed by an equal amount for the same duration ([modifiers.md](modifiers.md)).
- **Not in the book:** the order of several Speed changes of different kinds (+10 ft. and ×2 from two spells). The glossary has no rule for it.

## How the app uses it

The first evaluator is the total Speed: `totalSpeed` in `packages/shared/src/effectSpeedTotal.ts`, with its tests next to it. It expands conditions first (`expandConditions`, [conditions.md](conditions.md)): a condition from several effects counts once, Exhaustion adds up, and immunity to a condition cancels it. The character sheet uses it through `sheetTotals` (`packages/shared/src/sheetTotals.ts`, [plan/character-effects.md](../plan/character-effects.md)): the Speed is recomputed, the other components are gathered into lists with the effects or conditions each line came from. What this means for the engine is written in [plan/effects-coverage.md](../plan/effects-coverage.md):

- an applied effect remembers which catalog entry (spell) it came from (`source`), so that the same entry twice doesn't add up. Today two instances of one entry are identical, so the evaluator keeps the latest one;
- «the most potent» will need a way to compare two instances of one entry (a bonus, a die) once effects grow with the spell slot;
- **the order of Speed changes** (house rule, decided with the user on 2026-10-16, since the book is silent): first every «±N ft.», then «doubled» and «halved», last «becomes 0», after which nothing raises it. A special speed «equal to Speed» is taken from the result. Round down to a whole number, not to a multiple of 5 (Speed 25 halved is 12). Since «becomes 0» comes last, it also covers the conditions' «Speed 0 and can't increase». Several «±N» are summed and the sum can't take Speed below 0 before the doubling; one power of two with one rounding at the end, so Haste and Slow on Speed 25 leave 25, not 24.
- **Special speeds** (decided with the user on 2026-10-16; the glossary only says they change «by an equal amount»): the same operation as the Speed, so Fly 60 under Haste is 120 and Speed 0 makes every special speed 0. The same special speed from several sources doesn't add up: the highest applies (an interpretation). The creature hovers if any source of its Fly Speed grants hovering.
- **The same sense from several sources** (an interpretation, unverified: the glossary has no rule for it): the sheet shows it once with the longest range, as with special speeds. Two Darkvision effects of 60 and 120 ft. give Darkvision 120 ft.
- **Lists on the sheet** don't repeat: the same Resistance, roll line or per-turn line from two effects is one line naming both. Only effects the character's owner can see act on the character: hidden and deleted ones don't, as with inventory items.
