# Lasting modifiers

What 2024 spells change on a creature while they last (defenses, speed, Advantage, roll bonuses, Armor Class) and how the effect components of stage 7 in [plan/effects.md](../plan/effects.md) store it. Researched on 2026-10-16.

## Sources

- D&D Beyond, Basic Rules (2024), «Rules Glossary»: Advantage, Disadvantage, D20 Test, Armor Class (read word for word); Resistance, Vulnerability, Immunity, Speed (read only as a summary: **unverified wording**) (https://www.dndbeyond.com/sources/dnd/free-rules/rules-glossary).
- «Spell Descriptions» (https://www.dndbeyond.com/sources/dnd/br-2024/spell-descriptions): the spells below. Stoneskin, Shield and Slow were read only as a summary: **unverified wording**.
- Russian names of the defense levels and of the speeds («Скорость», «Скорость полёта», «Скорость лазания», «Скорость плавания», «Скорость копания»): next.dnd.su glossary (https://next.dnd.su/glossary/). «Парение [Hover]» was seen only in a summary: **unverified**.
- Advantage, read word for word on 2026-10-16: the spells Faerie Fire, Blur, Hex, Enlarge/Reduce, Bestow Curse, Haste, Foresight, Enhance Ability, Protection from Evil and Good, Guiding Bolt, Hunter's Mark, Meld into Stone; the glossary entries Dodge, D20 Test, Initiative, Invisible. Sanctuary, Shield of Faith, True Strike and Thaumaturgy were read only as a summary. The Russian terms «Преимущество», «Помеха», «Тест к20», «Проверка характеристики», «Спасбросок», «Бросок атаки» are from the next.dnd.su glossary, seen only in a summary of the page: **unverified**.
- Speed, read word for word on 2026-10-16: the glossary entries Speed, Fly Speed, Climb Speed, Burrow Speed, Hover, Round Down; the spells Longstrider, Ray of Frost, Haste, Slow, Fly, Spider Climb, Freedom of Movement, Alter Self, Power Word Stun, Flesh to Stone, Hypnotic Pattern, Spirit Guardians. The Swim Speed entry was read only as a summary: **unverified wording**.

## Rule

- **Advantage / Disadvantage:** roll two d20s and take the higher / lower. A roll can't have more than one of each; Advantage and Disadvantage on the same roll cancel.
- **D20 Test** covers ability checks, attack rolls and saving throws: whatever affects D20 Tests affects all three.
- **Resistance** halves damage of that type (rounded down), once per instance. **Vulnerability** doubles it. **Immunity** to a damage type or a condition means it doesn't affect the creature.
- **Speed:** «If an effect increases or decreases your Speed for a time, any special speed you have increases or decreases by an equal amount for the same duration»: Speed 0 also makes a Climb Speed 0, halving also halves a Fly Speed. Halving rounds down («Round Down»). Special speeds are Fly, Climb, Swim and Burrow; with several speeds the creature picks one per move and may switch, subtracting what it has already moved. Grappled, Paralyzed, Petrified and Restrained: «Your Speed is 0 and can't increase». The glossary has no rule for combining several Speed changes.
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
| Fly                                                            | Fly Speed 60 ft. and can hover                                                                            |
| Spider Climb                                                   | Climb Speed equal to its Speed                                                                            |
| Freedom of Movement, Alter Self (Aquatic Adaptation)           | Swim Speed equal to its Speed (Freedom of Movement also: magic can't reduce its Speed)                    |
| Power Word Stun, Flesh to Stone, Hypnotic Pattern              | Speed 0 (Haste also leaves Speed 0 for a turn after it ends)                                              |
| Spirit Guardians                                               | Speed halved inside the Emanation                                                                         |
| Enlarge / Reduce                                               | Advantage / Disadvantage on Strength checks and saves; +1d4 / −1d4 weapon damage                          |
| Faerie Fire                                                    | attack rolls against it have Advantage; can't benefit from Invisible                                      |
| Blur                                                           | attack rolls against it have Disadvantage                                                                 |
| Hex                                                            | Disadvantage on checks with one chosen ability                                                            |
| Enhance Ability                                                | Advantage on checks with one chosen ability                                                               |
| Foresight                                                      | Advantage on D20 Tests; attack rolls against it have Disadvantage                                         |
| Guiding Bolt                                                   | the next attack roll against it before the end of the caster's next turn has Advantage                    |
| Hunter's Mark                                                  | Advantage on Wisdom (Perception or Survival) checks to find the target                                    |
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
- **7.3 «Скорость»** (done): one change from a list. Ordinary Speed: «Больше на N фт.», «Меньше на N фт.» (N is always positive: a separate item instead of a minus sign, which phone keypads often lack), «Вдвое больше», «Вдвое меньше», «Становится 0». A special speed: Fly, Climb, Swim or Burrow, either N ft. or «равна Скорости» (Spider Climb); Fly may also hover. N is a multiple of 5 up to 300. Decided with the user on 2026-10-16, since the book doesn't say how several changes combine: one change of the ordinary Speed per effect, each special speed once. No fetched spell grants a Burrow Speed; it's in the list because the glossary defines it. Ray of Frost's −10 ft. lasts «until the start of your next turn», which is the effect duration «До следующего хода», not part of this component. Haste's Speed 0 after it ends is a separate effect. That a change of Speed also changes the special speeds is a rule of play on the map; the form only says so.
- **7.4 «Преимущество или помеха»** (done): Advantage or Disadvantage on one kind of roll: own attack rolls, attack rolls against the bearer, saving throws, ability checks, or all D20 Tests (Foresight). Saves and checks take one ability or all of them. Strength checks and saves (Enlarge/Reduce) or checks and saves with one ability (Bestow Curse) are two components. The same rolls appear once per effect, whether with Advantage or Disadvantage: by the book the two cancel on one roll, so both in one effect mean nothing; «all saves» and «Strength saves» are different rolls and may go together. Decided alone: one option was clearly simplest and covers every spell above.
  - **Left in the description:** a skill or a purpose («Perception to find it», Hunter's Mark; Lightly Obscured), «only the next attack» (Guiding Bolt: approximated by the duration «До следующего хода» if wanted), attacks only by certain creatures or against the caster (Protection from Evil and Good, Bestow Curse), Advantage on Initiative (no spell gives it; the glossary turns it into +5 to the Initiative score). Invisible gives its Advantage and Disadvantage through the condition component.
- 7.5–7.6 (no roll bonus and AC components yet): see the plan.
- **Left in the description:** protections that depend on who attacks (Protection from Evil and Good), Haste's extra action, Death Ward, Freedom of Movement's «can't reduce Speed». Speed changes inside an area (Spirit Guardians) and Difficult Terrain (Entangle, Web, Grease, Spike Growth) aren't this component: they belong to the area on the map. Expeditious Retreat and Jump don't change Speed.

## Where it lives in code

- `packages/shared/src/effectDefenses.ts`: the levels with Russian names, the component check, the «once per level» keys, the card line.
- `apps/web/src/features/simpleCatalog/EffectFields/DefenseComponentFields.tsx` and `defenseForm.ts`: the form.
- `packages/shared/src/effectAdvantage.ts`: the modes and rolls with Russian names, the check, the «once» key, the card line; `AdvantageComponentFields.tsx` and `advantageForm.ts`: the form.
- `packages/shared/src/effectSpeed.ts`: the speed changes with Russian names, the check, the «once» key, the card line; `SpeedComponentFields.tsx` and `speedForm.ts`: the form.
- `packages/shared/src/effectComponents.ts`: the field-less kind `no_healing` and `SINGLE_EFFECT_COMPONENT_KINDS`; `NoHealingComponentFields.tsx`: its card.
