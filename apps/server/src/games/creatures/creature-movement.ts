import { activeEffects, totalSpeed, type CharacterEffectEntry } from 'shared';
import type { SceneCreature } from './creature-read.js';

// Запас движения экземпляра (docs/plan/done/creature-movement.md): Скорость из копии в
// библиотеке с эффектами экземпляра (составляющая «Скорость», как у фигурки), пройдено и
// «Рывки» из его строки состояния; строки нет — запас полный. Скорость лазания — своя из
// стат-блока или от эффекта, с теми же изменениями Скорости (totalSpeed).
export function creatureMovement(
  creature: Pick<SceneCreature, 'speed' | 'climb'>,
  row: { moved: number; dashes: number } | undefined,
  effects: readonly CharacterEffectEntry[],
) {
  const total = totalSpeed(
    {
      speed: creature.speed,
      special: creature.climb === null ? {} : { climb: creature.climb },
    },
    activeEffects(effects),
  );
  return {
    speed: total.speed,
    climb: total.special.climb ?? null,
    moved: row?.moved ?? 0,
    dashes: row?.dashes ?? 0,
  };
}
