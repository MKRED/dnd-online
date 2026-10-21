import type { GameEventKind } from 'shared';

// События, после которых туман активной сцены пересчитывается (docs/plan/fog-of-war.md,
// «Когда пересчитываем»). Пересчёт — в записи журнала, а не в каждом месте, где
// что-то двигают: так новое событие не забудет про туман, и разница тумана позже
// уйдёт в той же записи (этап 4).
export const FOG_EVENT_KINDS: ReadonlySet<GameEventKind> = new Set([
  // Сцена и её настройки.
  'scene.activated',
  'scene.restarted',
  'scene.fog',
  // Правки мастера: блоки (снесли стену — за ней видно), объекты, отмена и возврат.
  'scene.edited',
  'scene.undone',
  'scene.redone',
  'creature.moved',
  // Фигурки и смотрящие.
  'figures.placed',
  'figure.placed',
  'figure.moved',
  'seat.freed',
  'member.left',
  'member.removed',
  // Хиты персонажа: без сознания он не смотрит.
  'character.changed',
] satisfies GameEventKind[]);
