import type { SpecialSpeed, SpeedTotal } from './effectSpeedTotal.js';
import type { MonsterAbilityEntry } from './monsterAbilities.js';
import type { MonsterEffectEntry } from './monsterLinks.js';
import type { MonsterSpeed, MonsterStatBlock } from './monsters.js';
import { creatureTotals } from './sheetTotals.js';

const SPECIAL: readonly SpecialSpeed[] = ['fly', 'climb', 'swim', 'burrow'];

// Особые скорости стат-блока в виде итога без эффектов: null в стат-блоке — скорости нет.
// «Парит» — только при полёте, как и в проверке стат-блока.
export function monsterSpecials(
  speed: MonsterSpeed,
): Omit<SpeedTotal, 'speed'> {
  const special: SpeedTotal['special'] = {};
  for (const kind of SPECIAL) {
    const feet = speed[kind];
    if (feet !== null) special[kind] = feet;
  }
  return { special, hover: speed.hover && speed.fly !== null };
}

// Итог карточки с эффектами (и КД монстра в бою, docs/plan/combat.md, этап 5) (docs/plan/done/monsters-npcs.md, этап 6): база — числа, которые
// ввёл мастер, черты и эффекты пересчитывают КД и скорости, как на листе персонажа. Черты
// (docs/plan/done/traits.md) считаются и без эффектов.
export function monsterTotals(
  block: MonsterStatBlock,
  effects: readonly MonsterEffectEntry[],
  abilities: readonly MonsterAbilityEntry[] = [],
) {
  return creatureTotals(
    {
      speed: { speed: block.speed.walk, ...monsterSpecials(block.speed) },
      armorClass: block.armorClass,
      dexterity: block.abilities.dexterity.score,
    },
    effects,
    abilities,
  );
}
