import { blockInfo } from '../../blockInfo.js';
import { AIR, cellRotation } from '../../cell.js';
import type { MapState } from '../../mapState.js';
import { shapeBoxes, type ShapeBox } from '../../shapes.js';
import type { Point3 } from '../creature.js';

// Клетка как цель лучей тумана (docs/plan/done/fog-of-war.md, «Как считаем видимое»).
// «open» — взгляд проходит клетку насквозь: воздух (и с обстановкой в нём), стекло, лёд.
// Луч идёт к центру и считается дошедшим, когда дошёл до самой клетки: сундук в клетке
// не закрывает её от взгляда. Видна — открываются все соседние блоки.
// «partial» — непрозрачная неполная фигура (плита, ступени, тонкая стена, столб): луч идёт
// к точкам её пустой части, а открываются только соседи за гранями, которые фигура
// закрывает не целиком: пол под верхней плитой виден, блок за тонкой стеной — нет.
export type SightTarget =
  | { kind: 'open' }
  | {
      kind: 'partial';
      points: readonly Point3[];
      openFaces: readonly boolean[];
    };

const OPEN: SightTarget = { kind: 'open' };

// Точки пустой части — сетка 2×2×2 по четвертям: у каждой фигуры набора хоть одна из них
// вне коробок (у ступеней — две над нижней ступенью).
const GRID = [0.25, 0.75];
// Грань закрыта, если все 16 точек сетки 4×4 на ней лежат на коробках, касающихся грани.
const FACE_SAMPLES = [0.125, 0.375, 0.625, 0.875];

const inside = (p: Point3, box: ShapeBox) =>
  [0, 1, 2].every((a) => p[a] > box[a] && p[a] < box[a + 3]);

// Грани в порядке соседей visibleCells: +x, −x, +y, −y, +z, −z.
function faceClosed(boxes: readonly ShapeBox[], axis: number, side: 0 | 1) {
  const [u, v] = [0, 1, 2].filter((a) => a !== axis);
  const touching = boxes.filter((box) =>
    side === 1 ? box[axis + 3] === 1 : box[axis] === 0,
  );
  return FACE_SAMPLES.every((su) =>
    FACE_SAMPLES.every((sv) =>
      touching.some(
        (box) =>
          su > box[u] && su < box[u + 3] && sv > box[v] && sv < box[v + 3],
      ),
    ),
  );
}

function partialTarget(boxes: readonly ShapeBox[]): SightTarget | null {
  const points: Point3[] = [];
  for (const x of GRID)
    for (const y of GRID)
      for (const z of GRID) {
        const p: Point3 = [x, y, z];
        if (!boxes.some((box) => inside(p, box))) points.push(p);
      }
  // Полный куб (или фигура без пустоты): целью не бывает, виден через соседей.
  if (points.length === 0) return null;
  const openFaces = [0, 1, 2].flatMap((axis) => [
    !faceClosed(boxes, axis, 1),
    !faceClosed(boxes, axis, 0),
  ]);
  return { kind: 'partial', points, openFaces };
}

// Цель по значению клетки, null — не цель (полный непрозрачный блок). Ответ — на
// значение, а не на клетку: поиск блока по имени дорог. Блок, которого каталог не знает,
// целью не считаем: открыв соседей, он выдал бы лишнее.
export function sightTargets(map: MapState) {
  const cache = new Map<number, SightTarget | null>();
  return (value: number): SightTarget | null => {
    if (value === AIR) return OPEN;
    let target = cache.get(value);
    if (target === undefined) {
      const block = blockInfo(map, value);
      target = !block
        ? null
        : !block.traits.opaque
          ? OPEN
          : partialTarget(shapeBoxes(block.shape, cellRotation(value)));
      cache.set(value, target);
    }
    return target;
  };
}
