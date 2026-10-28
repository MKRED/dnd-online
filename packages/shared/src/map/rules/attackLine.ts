import type { MapState } from '../mapState.js';
import {
  coverFromCounts,
  exposedSamplePoints,
  eyePoints,
  type Cover,
} from './cover.js';
import type { BodyBox, Point3 } from './creature.js';
import { pointInSolid, segmentBlocked, type RayMode } from './segment.js';

const COVER_ORDER: Cover[] = ['none', 'half', 'threeQuarters', 'total'];

export interface AttackLine {
  from: Point3;
  to: Point3;
  cover: Cover;
}

// Линия выстрела для луча на сцене (docs/plan/combat.md, «Выбор цели после этапа 5»):
// тот же расчёт, что у attackCover, — из точки глаз с лучшим укрытием (первой из
// равных, как там), к открытой точке тела цели, ближайшей к её середине. Луч не идёт
// сквозь стену, если выстрел возможен. Полное укрытие — null: стрелять нельзя.
export function attackLine(
  map: MapState,
  attacker: BodyBox,
  target: BodyBox,
  mode: RayMode,
): AttackLine | null {
  const points = exposedSamplePoints(map, target);
  if (points.length === 0) return null;
  const middle: Point3 = [
    (target.min[0] + target.max[0]) / 2,
    (target.min[1] + target.max[1]) / 2,
    (target.min[2] + target.max[2]) / 2,
  ];
  let best: { eye: Point3; open: Point3[]; rank: number } | null = null;
  for (const eye of eyePoints(attacker)) {
    if (pointInSolid(map, eye)) continue;
    const open = points.filter((p) => !segmentBlocked(map, eye, p, mode));
    const cover = coverFromCounts(points.length - open.length, points.length);
    const rank = COVER_ORDER.indexOf(cover);
    if (!best || rank < best.rank) best = { eye, open, rank };
    if (rank === 0) break;
  }
  if (!best || best.open.length === 0) return null;
  const to = best.open.reduce((a, b) =>
    distanceSq(b, middle) < distanceSq(a, middle) ? b : a,
  );
  return { from: best.eye, to, cover: COVER_ORDER[best.rank] };
}

function distanceSq(a: Point3, b: Point3): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}
