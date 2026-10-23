import {
  occupantsAt,
  type CreatureSize,
  type MapState,
  type Occupant,
  type Reach,
  type Vec3,
} from 'shared';
import type { PickedCells } from '../../../features/maps/editor/editorTools';
import type { WalkHover } from '../../../features/maps/walkTest';
import { walkHover } from '../../../features/maps/walkTest/walkHover';

// Что будет по клику с выбранной фигуркой (docs/plan/done/game.md, этап 7). Игрок и мастер в
// «Игре» только ходят — по достижимой позиции; мастер в «Правке» (free) ставит фигурку
// куда угодно, где она может стоять и где никого нет, без пути и запаса (решено с
// пользователем 2026-10-21, режимы — docs/plan/scene-page.md).
// at — где фигурка стоит сейчас (null — её нет на сцене): туда не ходят и не ставят.
export function figureHover(
  map: MapState,
  reach: readonly Reach[],
  cells: PickedCells,
  size: CreatureSize,
  others: readonly Occupant[],
  free: boolean,
  at: Vec3 | null,
): WalkHover {
  const hover = walkHover(map, reach, cells, size);
  if (at && hover.anchor.every((v, i) => v === at[i])) {
    return { ...hover, kind: 'blocked', line: [], cost: 0 };
  }
  if (free) {
    const free =
      hover.kind !== 'blocked' &&
      occupantsAt(map, hover.anchor, size, others).length === 0;
    return free
      ? { ...hover, kind: 'place', line: [], cost: 0 }
      : { ...hover, kind: 'blocked', line: [], cost: 0 };
  }
  return hover.kind === 'move'
    ? hover
    : { ...hover, kind: 'blocked', line: [], cost: 0 };
}
