# Senses

Reference for special senses (2024 edition). Researched on 2026-10-15.

## Rule

Sources: D&D Beyond, Free Rules (2024):

- «Rules Glossary», «Blindsight», «Darkvision», «Tremorsense», «Truesight» (https://www.dndbeyond.com/sources/dnd/free-rules/rules-glossary);
- «Character Origins», species traits (https://www.dndbeyond.com/sources/dnd/free-rules/character-origins);
- «Spell Descriptions» (https://www.dndbeyond.com/sources/dnd/free-rules/spell-descriptions);
- «Character Classes» (https://www.dndbeyond.com/sources/dnd/free-rules/character-classes) and «Feats» (https://www.dndbeyond.com/sources/dnd/free-rules/feats).

Russian names: next.dnd.su glossary (https://next.dnd.su/glossary/) and the Warlock page (https://next.dnd.su/class/warlock/).

### The four senses of the glossary

Each works "within a specific range" in feet. The glossary has no general «Senses» entry.

- **Darkvision / Тёмное зрение** — "you can see in Dim Light within a specified range as if it were Bright Light", Darkness as Dim Light, colors only as shades of gray.
- **Blindsight / Слепое зрение** — "you can see within a specific range without relying on physical sight": through the Blinded condition and Darkness, and Invisible creatures, unless they have Total Cover.
- **Tremorsense / Чувство вибрации** — "can pinpoint the location of creatures and moving objects within a specific range", only on a shared surface or liquid; not airborne things; it isn't sight.
- **Truesight / Истинное зрение** — sees through normal and magical Darkness, Invisibility, visual illusions and magical transformations, and into the Ethereal Plane.

Light: Dim Light is Lightly Obscured (Disadvantage on Perception to see), Darkness is Heavily Obscured ("You have the Blinded condition while trying to see something").

### Where they come from (examples found)

| Sense       | Source                                                   | Range   |
| ----------- | -------------------------------------------------------- | ------- |
| Darkvision  | Dragonborn, Elf, Gnome, Tiefling                         | 60 ft.  |
| Darkvision  | Dwarf, Orc, Drow lineage                                 | 120 ft. |
| Darkvision  | spell «Darkvision», 8 hours                              | 150 ft. |
| Tremorsense | Dwarf «Stonecunning», Bonus Action, on stone, 10 minutes | 60 ft.  |
| Blindsight  | Ranger 18 «Feral Senses»                                 | 30 ft.  |
| Truesight   | spell «True Seeing», 1 hour                              | 120 ft. |
| Truesight   | invocation «Witch Sight» / «Ведьмачий взор»              | 30 ft.  |
| Truesight   | Epic Boon «Boon of Truesight»                            | 60 ft.  |

Goliath, Halfling and Human have no darkvision. Not checked: the Aasimar (not in the part of the page read) and the Fighter, Monk and Rogue features (the page was read in parts).

### Two senses outside the glossary

- **Devil's Sight / Дьявольское зрение** (Warlock invocation): "You can see normally in Dim Light and Darkness—both magical and nonmagical—within 120 feet of yourself." Not Darkvision: no gray, and magical darkness too.
- **See Invisibility / Видение невидимого** (spell, 2nd level, 1 hour): "you see creatures and objects that have the Invisible condition as if they were visible, and you can see into the Ethereal Plane." No range. The Russian name of the spell is unverified.

## In the app

Decided with the user on 2026-10-15 ([plan/effects.md](../plan/effects.md)).

- The effect component «Чувство» (`kind: 'sense'`) has the kind and the range: `{ kind: 'sense', sense, range }` in the effect's `components`. An effect can carry several senses, each kind at most once. Effects saved before components, with category `sense` and `{ sense, range }` in `details`, read as one such component.
- **Six kinds:** the four of the glossary plus «Дьявольское зрение» and «Видение невидимого». The last two are the app's addition: the book doesn't list them as senses.
- **Range** is required, whole feet in steps of 5 (one map block is 5 ft.), up to 1000. «Видение невидимого» has none (`null`): it works wherever the creature looks. A forgotten range must not turn into an unlimited sense, so only that kind may omit it.
- Other senses (homebrew, «чует нежить») are written as a «Базовый» effect for now; a kind «Другое» can be added if they pile up.
- **Unverified, for later:** two sources of one sense (darkvision 60 ft. from the species plus the 150 ft. spell) most likely don't add up; the larger range applies.
- Nothing in play uses the sense yet: there is no lighting on the map. The effect only stores it.

Code: `packages/shared/src/effectSenses.ts` (kinds, `isSenseDetails`, Russian labels, `formatSense`); the component list is `packages/shared/src/effectComponents.ts`; the form fields are in `apps/web/src/features/simpleCatalog/EffectFields/SenseComponentFields.tsx`.
