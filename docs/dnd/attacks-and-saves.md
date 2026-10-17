# Attacks, saving throws and damage

Reference for how abilities hit their targets (2024 edition): attack rolls, saving throws, damage types, conditions and areas. Researched on 2026-10-16; attack bonus, range and reach added on 2026-10-17. How abilities and effects store this is in [plan/abilities.md](../plan/abilities.md) and [plan/effects.md](../plan/effects.md).

## Sources

D&D Beyond, Basic Rules (2024):

- «Rules Glossary»: «Damage Types», «Conditions», «Area of Effect», «Saving Throw», «Attack Roll», «Spell Attack» (https://www.dndbeyond.com/sources/dnd/free-rules/rules-glossary);
- «Spell Descriptions» (https://www.dndbeyond.com/sources/dnd/br-2024/spell-descriptions);
- «Character Classes», Monk «Stunning Strike» (https://www.dndbeyond.com/sources/dnd/br-2024/character-classes);
- spell pages «Searing Smite» (https://www.dndbeyond.com/spells/2619009-searing-smite) and «Hold Person» (https://www.dndbeyond.com/spells/2619153-hold-person).

Russian names: next.dnd.su glossary (https://next.dnd.su/glossary/).

## Rule

- **Attack roll / Бросок атаки** — a d20 test with a weapon, an Unarmed Strike or a spell, compared with the target's Armor Class. **Spell attack** — an attack roll made as part of a spell or another magical effect.
- **Saving throw / Спасбросок** — a roll to avoid or resist a threat, against a Difficulty Class (**Сложность**, «Сл»). A target can choose to fail it; a target without the needed ability fails automatically.
- **Area of effect** — six shapes, each with a point of origin; a spot behind Total Cover is outside the area.

### Damage types (13)

Acid / Кислота, Bludgeoning / Дробящий, Cold / Холод, Fire / Огонь, Force / Силовой, Lightning / Электричество, Necrotic / Некротический, Piercing / Колющий, Poison / Яд, Psychic / Психический, Radiant / Излучение, Slashing / Рубящий, Thunder / Звук.

### Conditions (15)

Blinded / Ослеплённый, Charmed / Очарованный, Deafened / Оглохший, Exhaustion / Истощение, Frightened / Испуганный, Grappled / Схваченный, Incapacitated / Недееспособный, Invisible / Невидимый, Paralyzed / Парализованный, Petrified / Окаменевший, Poisoned / Отравленный, Prone / Опрокинутый, Restrained / Опутанный, Stunned / Ошеломлённый, Unconscious / Бессознательный.

What each condition does, and how effects use them: [conditions.md](conditions.md).

### Area shapes (6)

Cone / Конус, Cube / Куб, Cylinder / Цилиндр, Emanation / Эманация, Line / Линия, Sphere / Сфера. The map geometry for them is in `packages/shared/src/map/rules/`.

## How spells and features combine them

Examples read in the sources above. They show that an attack and a save are steps inside an ability, not kinds of ability, and that one effect often has several parts.

| Ability                  | Check                                                    | Outcome                                                                                                                                                     |
| ------------------------ | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fire Bolt (cantrip)      | ranged spell attack, 120 ft.                             | hit: 1d10 Fire; +1d10 at levels 5, 11, 17                                                                                                                   |
| Sacred Flame (cantrip)   | Dexterity save, 60 ft., no benefit from Half or ¾ Cover  | fail: 1d8 Radiant; success: nothing stated                                                                                                                  |
| Burning Hands (1)        | Dexterity save, 15-ft. Cone                              | fail: 3d6 Fire; success: half                                                                                                                               |
| Fireball (3)             | Dexterity save, 20-ft.-radius Sphere, 150 ft.            | fail: 8d6 Fire; success: half; +1d6 per slot level above 3                                                                                                  |
| Guiding Bolt (1)         | ranged spell attack                                      | hit: 4d6 Radiant, and the next attack roll against it before the end of your next turn has Advantage                                                        |
| Ray of Sickness (1)      | ranged spell attack, 60 ft.                              | hit: 2d8 Poison and Poisoned until the end of your next turn                                                                                                |
| Melf's Acid Arrow (2)    | ranged spell attack, 90 ft.                              | hit: 4d4 Acid now and 2d4 Acid at the end of the target's next turn; miss: half the initial damage only                                                     |
| Ice Knife (1)            | ranged spell attack, then a Dexterity save               | hit: 1d10 Piercing; hit or miss, the target and each creature within 5 ft. save or take 2d6 Cold (success: nothing stated)                                  |
| Hold Person (2)          | Wisdom save, Concentration up to 1 minute                | fail: Paralyzed; repeats the save at the end of each of its turns, the spell ends on it on a success                                                        |
| Searing Smite (1)        | none: cast as a Bonus Action right after a hit           | extra 1d6 Fire; then at the start of each of its turns 1d6 Fire followed by a Constitution save, the spell ends on a success                                |
| Stunning Strike (Monk 5) | Constitution save, once per turn on a hit, 1 Focus Point | fail: Stunned until the start of your next turn; success: Speed halved and the next attack roll against it has Advantage, until the start of your next turn |

What follows from them for the app:

- an ability can have no check (Searing Smite), one check (most), or two in a row with a different target (Ice Knife);
- both outcomes can do something: half damage, part of the damage (Acid Arrow), or their own effect (Stunning Strike);
- an effect can combine parts (Searing Smite's burning: damage each turn plus a save that ends it);
- the repeated save belongs to the effect (its ability and when it's made), but the DC comes from whoever applied it.

## Several steps and repeats

Researched on 2026-10-17 in the free rules, «Spell Descriptions» (https://www.dndbeyond.com/sources/dnd/free-rules/spell-descriptions).

- **A second roll after the first, around the target:** Ice Knife — "Hit or miss, the shard then explodes. The target and each creature within 5 feet of it must succeed on a Dexterity saving throw or take 2d6 Cold damage." The first target is in the burst too.
- **Repeats with their own roll:** Scorching Ray — "You hurl three fiery rays. You can hurl them at one target within range or at several. Make a ranged spell attack for each ray"; Eldritch Blast — two beams at level 5, three at 11, four at 17, "the same target or … different ones. Make a separate attack roll for each beam"; Magic Missile — three darts, "1d4 + 1 Force damage", no roll, "one creature or several".
- **Jumps to new targets:** Chain Lightning — a first target, then "as many as three other targets", each "within 30 feet of the first target", each making a Dexterity save (10d8, half on a success); Chromatic Orb — on a hit, if two or more d8s match, "the orb leaps to a different target of your choice within 30 feet of the target", with a new attack and damage roll.
- **Healing the caster:** Vampiric Touch — on a hit 3d6 Necrotic, "and you regain Hit Points equal to half the amount of Necrotic damage dealt".

**In the app (stage 5, 2026-10-17):** a step after the first says when it happens (always, or on the previous step's hit/fail or miss/success) and whom it targets (the same target, the target and everyone within N ft. of it, or a new target); a step has a repeat count with its own roll each time and targets chosen when used. **Decided without the user (app rules, not the book):** «the target and everyone around» is not allowed with an attack roll (that is an area); «the same target» after «self» only without a check; an attack on «the same target» after an area rolls against each creature in it; after a step repeated more than once the next step runs for each repeat separately («the same target» and «around it» mean that repeat's target, «on a hit» only the repeats that hit; agreed with the user, no book example). **Left out on purpose:** Chromatic Orb's leap on matching dice and Chain Lightning's new targets measured from the first target stay in the description; healing the caster waits for effects.

## Attack bonus, damage, range and reach

Researched on 2026-10-17 in the free rules (Playing the Game, Equipment, Spells, Rules Glossary).

- **Attack roll:** d20 + the relevant ability modifier + the Proficiency Bonus if relevant. Strength for a melee attack with a weapon or an Unarmed Strike, Dexterity for a ranged attack with a weapon, the spellcasting ability for a spell attack. Finesse: "use your choice of your Strength or Dexterity modifier for the attack and damage rolls". The Proficiency Bonus is added for a weapon you're proficient with and for a spell.
- **Spell attack modifier** = spellcasting ability modifier + Proficiency Bonus. **Spell save DC** = 8 + spellcasting ability modifier + Proficiency Bonus.
- **Damage:** a weapon adds the same ability modifier as the attack (Finesse and Thrown say so explicitly; a general verbatim rule was not found, unverified). A spell says itself whether a modifier is added (Flame Blade: "3d6 plus your spellcasting ability modifier"); usually it isn't.
- **Critical Hit:** a 20 on the d20 hits regardless of AC; "Roll all of the attack's damage dice twice and add them together. Then add any relevant modifiers."
- **Range property:** two numbers, normal and long range ("Range 150/600" of the Longbow). Beyond normal range the attack has Disadvantage; beyond long range it can't be made.
- **Reach:** a melee weapon attacks within 5 feet; a Reach weapon adds 5 feet. Spell range forms: a distance in feet, Touch (within the caster's reach), Self; Unlimited appears as a value.
- **Examples:** Fire Bolt — ranged spell attack, 120 feet, 1d10 Fire; Shocking Grasp — Touch, melee spell attack, 1d8 Lightning; Longbow — 1d8 Piercing, Range 150/600.

**In the app (stage 3 of the ability plan, 2026-10-17):** an ability step is an attack of one of the four kinds (melee or ranged, weapon or spell). The target is Touch or a reach in feet for a melee attack, a range in feet for a ranged one, and a long range only for a ranged weapon. The attack bonus is an ability modifier plus the Proficiency Bonus — one of the six, «Сила или Ловкость» (Finesse; the game will take the higher) or the spellcasting ability — or a fixed number (a monster or an item). On a hit there are damage rows (dice + a number, a type) and one optional ability modifier for the whole damage; on a miss nothing or half the damage. **Departures:** weapon proficiency is assumed; the spellcasting ability isn't on the character sheet yet; the critical hit isn't stored, the game doubles the dice; damage growth (cantrips, higher slots) waits for the Spell stage. The Russian names of the four attack kinds are the app's own wording, not checked against next.dnd.su.

## Areas and saving throws

Researched on 2026-10-17 in the free rules (Rules Glossary, Spells, Spell Descriptions, Character Origins).

- **Sizes:** a Cone gives its maximum length (its width at a point equals the distance from the origin); a Cube its side; a Cylinder the radius of its base and its height; an Emanation the distance it extends; a Line its length and width; a Sphere its radius.
- **Point of origin:** Cone — the tip, Cube — anywhere on a face, Cylinder — the centre of the top or bottom circle, Emanation — a creature or object (it moves with it unless instantaneous or stationary), Sphere — the centre. The origin is included in a Sphere and a Cylinder; a Cone, Cube, Emanation and Line exclude it "unless its creator decides otherwise".
- **Where the area starts:** from the caster (Burning Hands «Self», 15-foot Cone; Thunderwave 15-foot Cube; Lightning Bolt 100-foot by 5-foot Line; Spirit Guardians 15-foot Emanation; Cone of Cold 60-foot Cone) or at a point within range (Fireball 150 feet, 20-foot-radius Sphere; Moonbeam 120 feet, 5-foot-radius 40-foot-high Cylinder).
- **Saving throw:** "The spell specifies the ability that the target uses for the save and what happens on a success or failure"; spell save DC = 8 + spellcasting ability modifier + Proficiency Bonus; the usual wording is "taking X damage on a failed save or half as much damage on a successful one". Dragonborn Breath Weapon: a 15-foot Cone or a 30-foot by 5-foot Line, chosen each time; Dexterity save, DC 8 + Constitution modifier + Proficiency Bonus; 1d10, half on a success. The general glossary entry on saving throws wasn't read verbatim.

**In the app (stage 4, 2026-10-17):** a step's check is an attack roll, a saving throw (the ability, and the DC as 8 + an ability modifier — the spellcasting one or one of six — + the Proficiency Bonus, or a number) or none (the damage simply happens, as with Magic Missile). An area is one of the six shapes with the book's sizes, from the caster or at a point within a range; an Emanation is always from the caster. **Decided with the user:** one shape per step (a Breath Weapon with a choice is two abilities or the second shape in the description); whether the area hits its creator is not stored — a Sphere and a Cylinder by geometry, the other shapes by the creator's choice when the ability is used on the map. «На себя» is only allowed without a check.

## Where it lives in code

The repeated save that ends an effect is the effect field `saveEnds` (`packages/shared/src/effectSaveEnds.ts`): the ability and the edge of the bearer's turn, no DC. The conditions are the effect component «Состояние» (`packages/shared/src/effectConditions.ts`, [conditions.md](conditions.md)). The damage types and dice are in `packages/shared/src/damageTypes.ts`, used so far by the effect component «Урон или лечение за ход» ([per-turn-damage.md](per-turn-damage.md)). The ability steps with an attack and damage are `packages/shared/src/abilitySteps.ts` (types and limits), `abilityStepsCheck.ts` (strict validation of a request), `abilityStepsRead.ts` (reading from the database with defaults for fields added later), `abilityStepLabels.ts` (card text), `abilityStepAreas.ts` and `abilityStepAreasCheck.ts` (area shapes, sizes and their validation); `abilityStepLinks.ts` (how a step after the first depends on the previous one: when, which targets); the form is `apps/web/src/features/simpleCatalog/StepsField/`. The area shapes will go to `packages/shared` with the ability and effect stages that use them.
