# Lasting modifiers

What 2024 spells change on a creature while they last (defenses, speed, Advantage, roll bonuses, Armor Class) and how the effect components of stage 7 in [plan/effects.md](../plan/effects.md) store it. Researched on 2026-10-16.

## Sources

- D&D Beyond, Basic Rules (2024), «Rules Glossary»: Advantage, Disadvantage, D20 Test, Armor Class (read word for word); Resistance, Vulnerability, Immunity, Speed (read only as a summary: **unverified wording**) (https://www.dndbeyond.com/sources/dnd/free-rules/rules-glossary).
- «Spell Descriptions» (https://www.dndbeyond.com/sources/dnd/br-2024/spell-descriptions): the spells below. Stoneskin, Shield and Slow were read only as a summary: **unverified wording**.
- Russian names of the defense levels: next.dnd.su glossary (https://next.dnd.su/glossary/).

## Rule

- **Advantage / Disadvantage:** roll two d20s and take the higher / lower. A roll can't have more than one of each; Advantage and Disadvantage on the same roll cancel.
- **D20 Test** covers ability checks, attack rolls and saving throws: whatever affects D20 Tests affects all three.
- **Resistance** halves damage of that type (rounded down), once per instance. **Vulnerability** doubles it. **Immunity** to a damage type or a condition means it doesn't affect the creature.
- **Speed:** halving rounds down; Speed 0 also makes a Climb Speed 0, halving also halves a Fly Speed.
- **Armor Class:** the base is 10 + Dexterity modifier. A rule may give another base calculation; the creature uses only one of them.

| Spell                                                          | What it changes while it lasts                                                                            |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Protection from Energy                                         | Resistance to one of Acid, Cold, Fire, Lightning, Thunder                                                 |
| Stoneskin                                                      | Resistance to Bludgeoning, Piercing, Slashing                                                             |
| Heroism                                                        | Immunity to Frightened (and Temporary Hit Points each turn, see [per-turn-damage.md](per-turn-damage.md)) |
| Mind Blank                                                     | Immunity to Psychic damage and to Charmed                                                                 |
| Chill Touch                                                    | can't regain Hit Points until the end of the caster's next turn                                           |
| Longstrider                                                    | Speed +10 ft.                                                                                             |
| Ray of Frost                                                   | Speed −10 ft. until the start of the caster's next turn                                                   |
| Haste                                                          | Speed doubled, +2 AC, Advantage on Dexterity saves, an extra limited action                               |
| Slow                                                           | Speed halved, −2 AC and Dexterity saves, no Reactions                                                     |
| Fly                                                            | Fly Speed 60 ft.                                                                                          |
| Enlarge / Reduce                                               | Advantage / Disadvantage on Strength checks and saves; +1d4 / −1d4 weapon damage                          |
| Faerie Fire                                                    | attack rolls against it have Advantage; can't benefit from Invisible                                      |
| Blur                                                           | attack rolls against it have Disadvantage                                                                 |
| Hex                                                            | Disadvantage on checks with one chosen ability                                                            |
| Bestow Curse                                                   | one of: Disadvantage on checks and saves with one ability, Disadvantage on attacks against the caster, …  |
| Bless / Bane                                                   | +1d4 / −1d4 to attack rolls and saving throws                                                             |
| Guidance                                                       | +1d4 to ability checks with one chosen skill                                                              |
| Shield of Faith                                                | +2 AC                                                                                                     |
| Shield                                                         | +5 AC for a round                                                                                         |
| Barkskin                                                       | AC is 17 if it was lower                                                                                  |
| Mage Armor                                                     | base AC 13 + Dexterity modifier without armor                                                             |
| Resistance (cantrip)                                           | reduces damage of one chosen type by 1d4, once per turn — not Resistance in the glossary sense            |
| Protection from Evil and Good, Death Ward, Freedom of Movement | conditional or one-off protections that don't fit a simple modifier                                       |

## How the app uses it

Decided with the user on 2026-10-16: not one universal «modifier» component but six kinds with their own fields, built one at a time ([plan/effects.md](../plan/effects.md), stage 7).

- **7.1 «Сопротивление и иммунитет»** (done): a level (Сопротивление, Уязвимость, Иммунитет) and the damage types it covers; Immunity may also list conditions. One component may cover several types, like Stoneskin. In one effect a damage type or a condition appears once per level; different levels for one type aren't forbidden, how they combine is a rule of play on the map. The Resistance cantrip's 1d4 isn't this component: it stays in the description.
- **7.2 «Запрет лечения»** (done): no fields, the bearer can't regain Hit Points, as from Chill Touch. Temporary Hit Points still come: getting them isn't healing ([per-turn-damage.md](per-turn-damage.md), unverified wording). Once per effect; the form disables the menu item when the effect already has it.
- 7.3–7.6 (no speed, Advantage, roll bonus and AC components yet): see the plan.
- **Left in the description:** protections that depend on who attacks (Protection from Evil and Good), Haste's extra action, Death Ward, Freedom of Movement.

## Where it lives in code

- `packages/shared/src/effectDefenses.ts`: the levels with Russian names, the component check, the «once per level» keys, the card line.
- `apps/web/src/features/simpleCatalog/EffectFields/DefenseComponentFields.tsx` and `defenseForm.ts`: the form.
- `packages/shared/src/effectComponents.ts`: the field-less kind `no_healing` and `SINGLE_EFFECT_COMPONENT_KINDS`; `NoHealingComponentFields.tsx`: its card.
