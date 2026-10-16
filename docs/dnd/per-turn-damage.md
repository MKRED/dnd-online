# Damage and healing each turn

How 2024 spells deal damage, heal or give Temporary Hit Points on every turn of the creature they affect, and how the effect component «Урон или лечение за ход» stores it. Researched on 2026-10-16.

## Sources

- D&D Beyond, Basic Rules (2024), «Spell Descriptions»: Heroism, Regenerate, Searing Smite, Melf's Acid Arrow, Spirit Guardians, Moonbeam, Vampiric Touch, Aura of Life (https://www.dndbeyond.com/sources/dnd/br-2024/spell-descriptions).
- «Rules Glossary»: Temporary Hit Points, Healing, Hit Points (https://www.dndbeyond.com/sources/dnd/free-rules/rules-glossary).
- «Playing the Game», «Damage and Healing» (https://www.dndbeyond.com/sources/dnd/br-2024/playing-the-game). The Temporary Hit Points part was read only as a summary, not word for word: **unverified wording**.

## Rule

| Spell                 | Each turn                                                                                                                          | Higher slot                                     |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Searing Smite (1)     | at the start of each of the target's turns: 1d6 Fire, **then** a Constitution save, the spell ends on a success                    | all the damage +1d6 per slot level above 1      |
| Regenerate (7)        | at the start of each of the target's turns: regains 1 Hit Point                                                                    | —                                               |
| Heroism (1)           | at the start of each of the target's turns: Temporary Hit Points equal to the caster's spellcasting ability modifier               | one more target per slot level, amount the same |
| Melf's Acid Arrow (2) | once: 2d4 Acid at the end of the target's next turn (not every turn)                                                               | +1d4 per slot level above 2                     |
| Spirit Guardians (3)  | an area: a creature that enters it or ends its turn there saves or takes 3d8 Radiant or Necrotic, half on a success; once per turn | +1d8 per slot level above 3                     |
| Moonbeam (2)          | an area: the same triggers, Constitution save, 2d10 Radiant, half on a success                                                     | +1d10 per slot level above 2                    |
| Vampiric Touch (3)    | not automatic: the caster attacks again as a Magic action on later turns                                                           | +1d6 per slot level above 3                     |
| Aura of Life (4)      | an area: an ally that starts its turn in it with 0 Hit Points regains 1                                                            | —                                               |

**Temporary Hit Points** (unverified wording): they are lost before real Hit Points and last until spent or until a Long Rest. They don't add up: on getting new ones the creature keeps either the old or the new amount. Healing doesn't restore them, and getting them isn't healing.

Damage and healing dice in the book are d4, d6, d8, d10 and d12.

## How the app uses it

- **The component** «Урон или лечение за ход» is on the creature that bears the effect: what (damage with one of the 13 types, healing, or Temporary Hit Points), how much (dice count 0–40, die d4–d12, a number 0–100, and a checkbox «+ модификатор наложившего»), and when (the start or the end of each of the bearer's turns). The sum can't be empty.
- **The modifier of whoever applied it** (Heroism) is a checkbox, decided with the user on 2026-10-16. The number itself comes from the ability that applied the effect, like the DC of the repeated save.
- **Growth with a higher slot** (Searing Smite's +1d6) isn't in the template either: the ability that applies the effect will give it.
- **Order on the same edge:** the damage comes before the repeated save, as in Searing Smite. Recorded for play on the map; nothing in code yet.
- **Several per effect are allowed**, even identical ones: an effect may burn and freeze at once.
- **Areas are not this component.** Spirit Guardians, Moonbeam and Aura of Life act on whoever is in an area, not on the bearer: that comes with areas in the ability plan. Melf's Acid Arrow's delayed 2d4 is one hit, not every turn: an effect with this component and a duration «до следующего хода», or the ability itself.
- **Temporary Hit Points not adding up** is a rule of play: it applies when effects work on the map.

## Where it lives in code

- `packages/shared/src/damageTypes.ts`: the 13 damage types with Russian names, the damage dice.
- `packages/shared/src/effectPerTurn.ts`: the component fields, the check, the card line.
- `apps/web/src/features/simpleCatalog/EffectFields/PerTurnComponentFields.tsx` and `perTurnForm.ts`: the form.
