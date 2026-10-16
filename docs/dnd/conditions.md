# Conditions

The 15 conditions of the 2024 rules and how the effect component «Состояние» uses them. Researched on 2026-10-16.

## Sources

- D&D Beyond, Basic Rules (2024), «Rules Glossary»: «Conditions», each condition's entry, «Grappling», «Long Rest», «Suffocation» (https://www.dndbeyond.com/sources/dnd/free-rules/rules-glossary).
- Russian names: next.dnd.su glossary (https://next.dnd.su/glossary/).

## Rule

A condition is a temporary game state. **A condition doesn't stack with itself**: a creature either has it or doesn't. Exhaustion is the exception.

| Condition                      | What it does                                                                                                                                                                                                    |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Blinded / Ослеплённый          | Can't see, fails checks that need sight. Attacks against it have Advantage, its attacks have Disadvantage.                                                                                                      |
| Charmed / Очарованный          | Can't attack the charmer or target it with damaging abilities or magical effects. The charmer has Advantage on social checks against it.                                                                        |
| Deafened / Оглохший            | Can't hear, fails checks that need hearing.                                                                                                                                                                     |
| Exhaustion / Истощение         | Levels: each time it's received, +1 level. D20 Tests −2 × level, Speed −5 ft. × level. Dies at level 6. A Long Rest removes 1 level; the condition ends at level 0.                                             |
| Frightened / Испуганный        | Disadvantage on ability checks and attack rolls while the source of fear is in line of sight. Can't willingly move closer to it.                                                                                |
| Grappled / Схваченный          | Speed 0. Disadvantage on attacks against anyone but the grappler. The grappler can drag or carry it.                                                                                                            |
| Incapacitated / Недееспособный | No action, Bonus Action or Reaction. Concentration breaks. Can't speak. Disadvantage on Initiative.                                                                                                             |
| Invisible / Невидимый          | Advantage on Initiative. Not affected by effects that need to see it. Attacks against it have Disadvantage, its attacks have Advantage (not against a creature that can see it).                                |
| Paralyzed / Парализованный     | Incapacitated, Speed 0, fails Strength and Dexterity saves. Attacks against it have Advantage; a hit from within 5 ft. is a Critical Hit.                                                                       |
| Petrified / Окаменевший        | Turned to stone with its nonmagical gear, weight ×10, doesn't age. Incapacitated, Speed 0, fails Strength and Dexterity saves, attacks against it have Advantage. Resistance to all damage, immune to Poisoned. |
| Poisoned / Отравленный         | Disadvantage on attack rolls and ability checks.                                                                                                                                                                |
| Prone / Опрокинутый            | Only crawls, or spends half its Speed to stand up and end the condition (not at Speed 0). Disadvantage on its attacks. Attacks against it: Advantage from within 5 ft., Disadvantage from farther.              |
| Restrained / Опутанный         | Speed 0. Attacks against it have Advantage, its attacks have Disadvantage. Disadvantage on Dexterity saves.                                                                                                     |
| Stunned / Ошеломлённый         | Incapacitated, fails Strength and Dexterity saves. Attacks against it have Advantage.                                                                                                                           |
| Unconscious / Бессознательный  | Incapacitated and Prone, drops what it holds, stays Prone after it ends. Speed 0, fails Strength and Dexterity saves, attacks against it have Advantage, a hit from within 5 ft. is a Critical Hit. Unaware.    |

- **Conditions that include others:** Paralyzed, Petrified, Stunned and Unconscious include Incapacitated; Unconscious also includes Prone.
- **Grappled ends** when the creature escapes (an action: Strength (Athletics) or Dexterity (Acrobatics) check against the escape DC, 8 + the grappler's Strength modifier + Proficiency Bonus), when the grappler is Incapacitated, when they move out of range, or when the grappler lets go.
- **Exhaustion from other sources:** sleep in a Long Rest gives Unconscious; suffocation gives 1 level at the end of each turn without air, all removed once it can breathe; dehydration and malnutrition add levels that a Long Rest can't remove until the creature eats or drinks.

## How the app uses it

- **The component «Состояние»** of an effect is one of the 15 conditions ([plan/effects.md](../plan/effects.md)). The rules above aren't copied into the effect: the form shows a one-line hint, the full rule is here and in the book.
- **Each condition once per effect**, following «doesn't stack with itself». A request with the same condition twice gets 400.
- **Exhaustion has no level field.** Each time it's received it gives one level, so an effect with «Истощение» means +1 level. Not checked against every 2024 spell: if one gives several levels at once, that's a question for the user.
- **No source in the template.** Charmed (the charmer), Frightened (the source of fear) and Grappled (the grappler and the escape DC) depend on who applied the effect. Like the DC of the repeated save, that comes from the ability that applied it or is kept in the applied instance, not in the catalog entry.
- **Included conditions aren't added or forbidden.** An effect with Paralyzed doesn't get Incapacitated automatically, and an effect may list both; the redundant pair changes nothing.
- **Prone and Grappled end by what the creature does** (standing up, escaping), not by the duration. The effect's duration stays whatever the author picks; ending them by those actions comes with play on the map.

## Where it lives in code

- `packages/shared/src/effectConditions.ts`: the 15 keys, the Russian names, the component check.
- `packages/shared/src/effectComponents.ts`: the component kind `condition`, the «once per effect» check, the card line.
- `apps/web/src/features/simpleCatalog/EffectFields/ConditionComponentFields.tsx`: the form field with a one-line hint under it.
