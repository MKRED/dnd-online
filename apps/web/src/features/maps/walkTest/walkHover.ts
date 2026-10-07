import {
  feetHeight,
  pathFromReach,
  type BodyBox,
  type CreatureSize,
  type MapState,
  type Point3,
  type Reach,
  type Vec3,
} from 'shared';
import type { PickedCells } from '../editor/editorTools';
import { anchorOffset, walkBody, walkTarget } from './walkTarget';

// Что будет по клику: move — дойти (путь в пределах оставшихся футов), place —
// переставить фигурку (стоять можно, но не дойти, или фигурки ещё нет),
// blocked — стоять нельзя.
export type WalkHoverKind = 'move' | 'place' | 'blocked';

export interface WalkHover {
  kind: WalkHoverKind;
  anchor: Vec3;
  body: BodyBox;
  // Только для move: точки линии пути (середины клеток курсора над ногами) и цена.
  line: Point3[];
  cost: number;
}

// Линия чуть над полом, чтобы не пряталась в плитках подсветки.
const LINE_LIFT = 0.12;

// Позиция под курсором и путь до неё. Сначала ищем среди достижимых — по тем же
// клеткам, что и при постановке (попадание, потом соседняя), с тем же сдвигом для
// крупных существ; иначе — обычная постановка.
export function walkHover(
  map: MapState,
  reach: readonly Reach[],
  cells: PickedCells,
  size: CreatureSize,
): WalkHover {
  const offset = anchorOffset(size);
  const candidates = cells.hit ? [cells.hit, cells.place] : [cells.place];
  for (const cell of candidates) {
    const anchor: Vec3 = [cell[0] - offset, cell[1], cell[2] - offset];
    const path = pathFromReach(reach, anchor);
    if (!path) continue;
    return {
      kind: 'move',
      anchor,
      body: walkBody(map, anchor, size),
      line: path.path.map((at) => [
        at[0] + offset + 0.5,
        feetHeight(map, at, size) + LINE_LIFT,
        at[2] + offset + 0.5,
      ]),
      cost: path.cost,
    };
  }
  const target = walkTarget(map, cells, size);
  return {
    kind: target.ok ? 'place' : 'blocked',
    anchor: target.anchor,
    body: walkBody(map, target.anchor, size),
    line: [],
    cost: 0,
  };
}
