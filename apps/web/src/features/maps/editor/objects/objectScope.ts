import type { MapObject } from 'shared';
import type { RecentPlace } from '../PlacePicker/placeChoice';
import type { ObjectChoice } from './objectPlacement';

// Какие объекты берёт инструмент (замечания после первой партии, 2026-10-26): в редакторе
// карты «Строить» — все; на сцене игры «Строить» — только вещи (обстановку, контейнеры,
// предметы, старты), а монстров и НПС ставит и двигает инструмент «Существа».
export type ObjectScope = 'all' | 'things' | 'creatures';

export const isCreatureObject = (object: MapObject) =>
  object.kind === 'monster' || object.kind === 'npc';

export function objectInScope(scope: ObjectScope, object: MapObject): boolean {
  if (scope === 'all') return true;
  return isCreatureObject(object) === (scope === 'creatures');
}

export function choiceInScope(
  scope: ObjectScope,
  choice: ObjectChoice,
): boolean {
  if (scope === 'all') return true;
  return (choice.kind === 'creature') === (scope === 'creatures');
}

// Недавние инструмента: у «Существ» — только существа, у «Строить» на сцене — без них.
export function recentInScope(
  scope: ObjectScope,
  recent: RecentPlace,
): boolean {
  if (recent.type === 'block') return scope !== 'creatures';
  return choiceInScope(scope, recent.choice);
}
