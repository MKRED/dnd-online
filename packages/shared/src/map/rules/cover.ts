import type { MapState } from '../mapState.js';
import type { BodyBox, Point3 } from './creature.js';
import { pointInSolid, segmentBlocked, type RayMode } from './segment.js';

export type Cover = 'none' | 'half' | 'threeQuarters' | 'total';

export const COVER_LABELS: Record<Cover, string> = {
  none: 'Нет укрытия',
  half: 'Укрытие на половину',
  threeQuarters: 'Укрытие на три четверти',
  total: 'Полное укрытие',
};

// Глаза — ниже макушки на четверть блока. Точки тела отступают от краёв основания:
// существо уже своей клетки, а точка на границе клетки давала бы касательные лучи.
const EYE_DEPTH = 0.25;
const EDGE_INSET = 0.1;

function horizontalPositions(min: number, max: number): number[] {
  return [min + EDGE_INSET, (min + max) / 2, max - EDGE_INSET];
}

// Откуда смотрит существо: центр и углы основания на уровне глаз. Атакующий берёт
// лучшую из точек — высовывается из-за угла (как выбор угла клетки в DMG).
export function eyePoints(body: BodyBox): Point3[] {
  const y = body.max[1] - EYE_DEPTH;
  const [x0, , x1] = horizontalPositions(body.min[0], body.max[0]);
  const [z0, , z1] = horizontalPositions(body.min[2], body.max[2]);
  const cx = (body.min[0] + body.max[0]) / 2;
  const cz = (body.min[2] + body.max[2]) / 2;
  return [
    [cx, y, cz],
    [x0, y, z0],
    [x1, y, z0],
    [x0, y, z1],
    [x1, y, z1],
  ];
}

// Точки по всему телу цели: 3×3 по основанию и по 2 уровня на каждый блок роста.
// Уровни стоят в серединах половин блока (0,25; 0,75; …), поэтому нижняя половина
// Среднего надёжно ниже верха стены в 1 блок, а верхняя — надёжно выше.
export function bodySamplePoints(body: BodyBox): Point3[] {
  const height = body.max[1] - body.min[1];
  const levels = Math.max(2, Math.round(height * 2));
  const points: Point3[] = [];
  for (let level = 0; level < levels; level++) {
    const y = body.min[1] + ((level + 0.5) / levels) * height;
    for (const x of horizontalPositions(body.min[0], body.max[0])) {
      for (const z of horizontalPositions(body.min[2], body.max[2])) {
        points.push([x, y, z]);
      }
    }
  }
  return points;
}

// Точки тела внутри фигуры в клетке самого существа (тонкая стена у края, столб)
// перекрыты с любой стороны — это не укрытие, а несовпадение тела с сеткой. Их не считаем.
export function exposedSamplePoints(map: MapState, body: BodyBox): Point3[] {
  return bodySamplePoints(body).filter((p) => !pointInSolid(map, p));
}

// Правила 2024: укрытие — доля цели, закрытая препятствием. Сравниваем целые числа,
// чтобы ровно половина не зависела от округления.
export function coverFromCounts(blocked: number, total: number): Cover {
  if (blocked === total) return 'total';
  if (blocked * 4 >= total * 3) return 'threeQuarters';
  if (blocked * 2 >= total) return 'half';
  return 'none';
}

const COVER_ORDER: Cover[] = ['none', 'half', 'threeQuarters', 'total'];

// Укрытие цели от одной точки (точка начала области, глаз атакующего).
export function coverFromPoint(
  map: MapState,
  origin: Point3,
  target: BodyBox,
  mode: RayMode,
): Cover {
  const points = exposedSamplePoints(map, target);
  const blocked = points.filter((p) =>
    segmentBlocked(map, origin, p, mode),
  ).length;
  return coverFromCounts(blocked, points.length);
}

// Укрытие от лучшей из точек: для атаки — eyePoints атакующего. Для области точка
// начала одна и фиксирована, туда передаётся массив из одной точки.
export function coverFromPoints(
  map: MapState,
  origins: readonly Point3[],
  target: BodyBox,
  mode: RayMode,
): Cover {
  let best = COVER_ORDER.length - 1;
  for (const origin of origins) {
    const cover = coverFromPoint(map, origin, target, mode);
    best = Math.min(best, COVER_ORDER.indexOf(cover));
    if (best === 0) break;
  }
  return COVER_ORDER[best];
}

export function attackCover(
  map: MapState,
  attacker: BodyBox,
  target: BodyBox,
  mode: RayMode,
): Cover {
  const eyes = eyePoints(attacker).filter((p) => !pointInSolid(map, p));
  return coverFromPoints(map, eyes, target, mode);
}
