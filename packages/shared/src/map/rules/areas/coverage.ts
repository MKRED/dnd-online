import type { Vec3 } from '../../coords.js';
import type { MapState } from '../../mapState.js';
import type { BodyBox, Point3 } from '../creature.js';
import { segmentBlocked } from '../segment.js';
import { prepareArea, type AreaShape } from './shapes.js';

// Точек на ось внутри клетки. Чётное число: граница ровно посередине клетки делит
// точки поровну, и «ровно половина» не зависит от округления.
const SAMPLES_PER_AXIS = 4;
const SAMPLES = SAMPLES_PER_AXIS ** 3;

function cellSamples(cell: Vec3): Point3[] {
  const points: Point3[] = [];
  const step = 1 / SAMPLES_PER_AXIS;
  for (let i = 0; i < SAMPLES_PER_AXIS; i++) {
    for (let j = 0; j < SAMPLES_PER_AXIS; j++) {
      for (let k = 0; k < SAMPLES_PER_AXIS; k++) {
        points.push([
          cell[0] + (i + 0.5) * step,
          cell[1] + (j + 0.5) * step,
          cell[2] + (k + 0.5) * step,
        ]);
      }
    }
  }
  return points;
}

// Клетки, задетые областью. По DMG 2024 клетка задета, если фигура накрывает
// не меньше половины её (у нас — объёма). Часть фигуры за препятствием не считается:
// точка клетки засчитывается, только если до неё доходит луч эффекта от точки начала.
// Поэтому клетки за стеной и сами сплошные блоки в область не попадают.
export function areaCells(map: MapState, area: AreaShape): Vec3[] {
  const prepared = prepareArea(area);
  const cells: Vec3[] = [];
  const from = prepared.min.map(Math.floor);
  const to = prepared.max.map((v) => Math.ceil(v) - 1);
  for (let y = from[1]; y <= to[1]; y++) {
    for (let z = from[2]; z <= to[2]; z++) {
      for (let x = from[0]; x <= to[0]; x++) {
        const cell: Vec3 = [x, y, z];
        let covered = 0;
        let checked = 0;
        for (const p of cellSamples(cell)) {
          checked++;
          if (
            prepared.contains(p) &&
            !segmentBlocked(map, prepared.origin, p, 'effect')
          ) {
            covered++;
          }
          // Исход уже ясен — оставшиеся точки не меняют ответ.
          if (covered * 2 >= SAMPLES) break;
          if ((covered + SAMPLES - checked) * 2 < SAMPLES) break;
        }
        if (covered * 2 >= SAMPLES) cells.push(cell);
      }
    }
  }
  return cells;
}

// Задето ли существо: на сетке — если задета хоть одна клетка, которую занимает его тело.
// Укрытие от области считает coverFromPoints с точкой начала (prepareArea(area).origin).
export function areaAffectsBody(
  cells: readonly Vec3[],
  body: BodyBox,
): boolean {
  const lo = body.min.map(Math.floor);
  const hi = body.max.map((v) => Math.ceil(v) - 1);
  return cells.some((cell) =>
    [0, 1, 2].every((a) => cell[a] >= lo[a] && cell[a] <= hi[a]),
  );
}
