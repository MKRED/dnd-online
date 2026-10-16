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

Nothing computes effects yet. What this means for the future engine is written in [plan/effects-coverage.md](../plan/effects-coverage.md):

- an applied effect has to remember which catalog entry (spell) it came from, so that the same entry twice doesn't add up;
- «the most potent» needs a way to compare two instances of one entry (a bonus, a die);
- **the order of Speed changes** (house rule, decided with the user on 2026-10-16, since the book is silent): first every «±N ft.», then «doubled» and «halved», last «becomes 0», after which nothing raises it. A special speed «equal to Speed» is taken from the result. Round down. Not in code yet: it comes with the first evaluator.
