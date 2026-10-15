# Durations

Reference for how long spells and other effects last (2024 edition). Researched on 2026-10-15.

## Rule

Sources: D&D Beyond, Free Rules (2024):

- «Spells», section «Duration» (https://www.dndbeyond.com/sources/dnd/free-rules/spells);
- «Spell Descriptions», the «Duration» line of every spell (https://www.dndbeyond.com/sources/dnd/free-rules/spell-descriptions);
- «Playing the Game», combat (https://www.dndbeyond.com/sources/dnd/free-rules/playing-the-game);
- «Rules Glossary», «Concentration», «Short Rest», «Long Rest», «Condition» (https://www.dndbeyond.com/sources/dnd/free-rules/rules-glossary);
- «Character Classes», Barbarian «Rage» and «Reckless Attack», Bard «Bardic Inspiration» (https://www.dndbeyond.com/sources/dnd/free-rules/character-classes).

### Duration forms of a spell

The book names three: "A duration typically takes one of the following forms":

- **Concentration** — "follows the Concentration rules (see the Rules Glossary)". Written as "Concentration, up to 1 minute".
- **Instantaneous** — "the spell's magic appears only for a moment and then disappears". What it caused (damage, a condition with its own end rule) can last longer: Ray of Frost is instantaneous, yet the target's Speed "is reduced by 10 feet until the start of your next turn".
- **Time Span** — "how long the spell lasts in rounds, minutes, hours, or the like". "While a time-span spell that you cast is ongoing, you can dismiss it (no action required) if you don't have the Incapacitated condition."

Every distinct «Duration» line found in the spell list:

- Instantaneous;
- 1 round, 6 rounds;
- 1 minute, 10 minutes;
- 1 hour, 8 hours, 24 hours;
- 1 day, 7 days, 10 days, 30 days;
- Up to 1 minute, Up to 1 hour, Up to 8 hours — the caster can end it sooner;
- Concentration, up to 1 minute / 10 minutes / 1 hour / 2 hours / 8 hours / 1 day;
- Until dispelled (Arcane Lock, Simulacrum);
- Until dispelled or triggered (Glyph of Warding, Symbol);
- Special.

### Time

- "A round represents about 6 seconds in the game world." So a minute is 10 rounds. The book doesn't say "10 rounds per minute" in the text found; it follows from the 6 seconds.
- A Short Rest is "a 1-hour period of downtime", a Long Rest "at least 8 hours".

### Ends tied to a turn

Short effects of features and spells end at a turn boundary, not after a number of rounds:

- "until the start of your next turn" — Dodge, Reckless Attack, Ray of Frost;
- "until the end of your next turn" — Rage: "The Rage lasts until the end of your next turn", each extension "lasts until the end of your next turn", "You can maintain a Rage for up to 10 minutes";
- "on the next attack roll it makes before the end of its next turn" — Vicious Mockery.

"Your" here is the creature that created the effect, not always the one it lies on: Ray of Frost slows the target until the start of the caster's turn.

### Concentration

- "If the effect's creator loses Concentration, the effect ends." The creator can end it "at any time (no action required)".
- It ends when the creator starts another Concentration effect, has the Incapacitated condition or dies, or fails the Constitution save after taking damage.

### Conditions and rests

- Conditions have no general duration: "various rules define how to end a condition". "A condition doesn't stack with itself."
- Exhaustion is the one rest-bound example found: "Finishing a Long Rest removes 1 of your Exhaustion levels."
- **Not found:** a spell or condition lasting "until you finish a Short or Long Rest" in the pages above. Rest-bound benefits exist in the book (limited uses of features), but no rest-bound duration form was found. Unverified whether the full Player's Handbook has one.

## In the app

Decided with the user on 2026-10-15 ([plan/effects.md](../plan/effects.md)). Duration is a field of every effect in the catalog. It is the template's duration: the time left will belong to an effect applied to a character.

- **Бессрочно** (`permanent`) — until removed. Covers "Until dispelled" and permanent traits: the user adds «Тёмное зрение» to their elf by hand, there is no species → effect link. Effects saved before the field existed read as this.
- **Время** (`time`) — 1–999 rounds, minutes, hours or days, with an optional «Концентрация» flag (only here, as in the book: "Concentration, up to …").
- **До следующего хода** (`turn`) — the start or the end of the next turn, of the creator (the default, as "your next turn" in a spell) or of the bearer.
- **До отдыха** (`rest`) — until the bearer finishes a short or long rest, or only a long one. **House rule:** the book has no such duration form (see above); kept because it is handy for one's own effects.
- **No «Мгновенно»:** an effect in the catalog is something that stays on a creature. An instantaneous spell is an ability, and what it leaves behind is an effect with its own duration.
- "Special" and "Until dispelled or triggered" are written as «Бессрочно» with the rule in the description.
- Ending early on a successful save ("repeat the save at the end of each of its turns") is not a duration kind; it comes with the effect categories that need it.

Code: `packages/shared/src/effectDuration.ts` (`EffectDuration`, `isEffectDuration`) and `effectDurationLabels.ts` (the Russian text with plurals); the server stores it in `effects.extra`, the form is `apps/web/src/features/simpleCatalog/DurationField/`.
