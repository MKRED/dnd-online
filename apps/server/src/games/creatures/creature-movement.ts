import { activeEffects, totalSpeed, type CharacterEffectEntry } from 'shared';
import type { SceneCreature } from './creature-read.js';

// Запас движения экземпляра (docs/plan/done/creature-movement.md): Скорость из копии в
// библиотеке с эффектами экземпляра (составляющая «Скорость», как у фигурки), пройдено и
// «Рывки» из его строки состояния; строки нет — запас полный.
export function creatureMovement(
  creature: Pick<SceneCreature, 'speed'>,
  row: { moved: number; dashes: number } | undefined,
  effects: readonly CharacterEffectEntry[],
) {
  return {
    speed: totalSpeed({ speed: creature.speed }, activeEffects(effects)).speed,
    moved: row?.moved ?? 0,
    dashes: row?.dashes ?? 0,
  };
}
