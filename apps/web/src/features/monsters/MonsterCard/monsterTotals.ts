import {
  creatureTotals,
  type MonsterEffectEntry,
  type MonsterSpeed,
  type MonsterStatBlock,
  type SpecialSpeed,
  type SpeedTotal,
} from 'shared';

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

// Итог карточки с эффектами (docs/plan/done/monsters-npcs.md, этап 6): база — числа, которые
// ввёл мастер, эффекты пересчитывают КД и скорости, как на листе персонажа.
export function monsterTotals(
  block: MonsterStatBlock,
  effects: readonly MonsterEffectEntry[],
) {
  return creatureTotals(
    {
      speed: { speed: block.speed.walk, ...monsterSpecials(block.speed) },
      armorClass: block.armorClass,
      dexterity: block.abilities.dexterity.score,
    },
    effects,
  );
}
