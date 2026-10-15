# Attacks, saving throws and damage

Reference for how abilities hit their targets (2024 edition): attack rolls, saving throws, damage types, conditions and areas. Researched on 2026-10-16. Not used in code yet: the decision on how abilities and effects store this is in [plan/abilities.md](../plan/abilities.md) and [plan/effects.md](../plan/effects.md).

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

What each condition does is not recorded yet: that comes with the effect stage «Состояние из книги».

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

## Where it lives in code

The repeated save that ends an effect is the effect field `saveEnds` (`packages/shared/src/effectSaveEnds.ts`): the ability and the edge of the bearer's turn, no DC. The rest is not in code yet. The damage types, conditions and area shapes will go to `packages/shared` with the ability and effect stages that use them.
