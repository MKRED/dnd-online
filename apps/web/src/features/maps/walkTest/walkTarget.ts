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

// Сдвиг привязки от клетки под курсором: курсор держит середину основания
// (у Большого — его угол с наименьшими x и z, у Огромного — центр).
export function anchorOffset(size: CreatureSize): number {
  const cells = Math.ceil(CREATURE_SIZES[size].footprint);
  return Math.floor((cells - 1) / 2);
}

// Куда встанет фигурка по клику. Сначала пробуем клетку, в которую попал луч, —
// так фигурка встаёт на плиту и ступень (стоят в своей же клетке на +½), — потом
// соседнюю со стороны грани: над верхом блока или рядом со стеной. Если стоять
// нельзя ни там, ни там — соседняя клетка с ok = false, чтобы показать красным.
export function walkTarget(
  map: MapState,
  cells: PickedCells,
  size: CreatureSize,
): WalkTarget {
  const offset = anchorOffset(size);
  const shift = (cell: Vec3): Vec3 => [
    cell[0] - offset,
    cell[1],
    cell[2] - offset,
  ];
  const candidates = cells.hit ? [cells.hit, cells.place] : [cells.place];
  for (const cell of candidates) {
    const anchor = shift(cell);
    if (standHeight(map, anchor, size) !== null) return { anchor, ok: true };
  }
  return { anchor: shift(cells.place), ok: false };
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
  const cells = Math.ceil(CREATURE_SIZES[size].footprint);
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
