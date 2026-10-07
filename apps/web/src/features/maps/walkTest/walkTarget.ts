import {
  CREATURE_SIZES,
  creatureBody,
  standHeight,
  surfaceInCell,
  type BodyBox,
  type CreatureSize,
  type MapState,
  type Vec3,
} from 'shared';
import type { PickedCells } from '../editor/editorTools';

export interface WalkTarget {
  // Клетка привязки: ноги, наименьшие x и z основания.
  anchor: Vec3;
  // Можно ли тут стоять существу этого размера.
  ok: boolean;
}

// Ширина основания в клетках (Крошечный занимает клетку целиком).
export function bodyCells(size: CreatureSize): number {
  return Math.ceil(CREATURE_SIZES[size].footprint);
}

// Угол основания по одной горизонтальной оси для клетки-кандидата c. Если грань
// смотрит вдоль этой оси (бок стены), тело начинается в клетке c и уходит от
// грани. Иначе центр тела ставим ближе всего к курсору: у нечётных размеров он
// в середине клетки под курсором, у чётных — в ближайшем к курсору углу клеток,
// так что тело смещается в ту четверть клетки, куда наведён курсор.
function axisAnchor(
  c: number,
  point: number,
  normal: number,
  cells: number,
): number {
  if (normal > 0) return c;
  if (normal < 0) return c - cells + 1;
  return Math.floor(point - cells / 2 + 0.5);
}

// Позиции-кандидаты под курсором: сначала по клетке, в которую попал луч, —
// так фигурка встаёт на плиту и ступень (стоят в своей же клетке на +½), — потом
// по соседней со стороны грани: над верхом блока или рядом со стеной.
export function walkAnchors(cells: PickedCells, size: CreatureSize): Vec3[] {
  const n = bodyCells(size);
  const { point, normal } = cells;
  const candidates = cells.hit ? [cells.hit, cells.place] : [cells.place];
  return candidates.map((c) => [
    axisAnchor(c[0], point[0], normal[0], n),
    c[1],
    axisAnchor(c[2], point[2], normal[2], n),
  ]);
}

// Середина основания на уровне угла привязки: через неё идёт линия пути и по ней
// ставится плитка достижимой позиции.
export function bodyCentre(anchor: Vec3, size: CreatureSize): [number, number] {
  const half = bodyCells(size) / 2;
  return [anchor[0] + half, anchor[2] + half];
}

// Куда встанет фигурка по клику: первый кандидат, где можно стоять. Если нигде
// нельзя — последний (соседняя клетка) с ok = false, чтобы показать красным.
export function walkTarget(
  map: MapState,
  cells: PickedCells,
  size: CreatureSize,
): WalkTarget {
  const anchors = walkAnchors(cells, size);
  for (const anchor of anchors) {
    if (standHeight(map, anchor, size) !== null) return { anchor, ok: true };
  }
  return { anchor: anchors[anchors.length - 1], ok: false };
}

// Тело фигурки для подсветки и показа. creatureBody ставит ноги на самый высокий
// верх в основании, и если основание задевает стену (Большой в узкой двери), тело
// всплыло бы на целый блок. Полный блок в основании — препятствие, а не опора, так
// что ноги считаем только по неполным клеткам. На годном месте полных блоков в
// основании нет, и тело совпадает с creatureBody.
export function walkBody(
  map: MapState,
  anchor: Vec3,
  size: CreatureSize,
): BodyBox {
  const body = creatureBody(map, anchor, size);
  const cells = bodyCells(size);
  let top = 0;
  for (let dx = 0; dx < cells; dx++) {
    for (let dz = 0; dz < cells; dz++) {
      const surface = surfaceInCell(map, [
        anchor[0] + dx,
        anchor[1],
        anchor[2] + dz,
      ]);
      if (surface < 1) top = Math.max(top, surface);
    }
  }
  const drop = body.min[1] - (anchor[1] + top);
  return {
    min: [body.min[0], body.min[1] - drop, body.min[2]],
    max: [body.max[0], body.max[1] - drop, body.max[2]],
  };
}
