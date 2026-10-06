import type { Vec3 } from '../../coords.js';
import type { BodyBox, Point3 } from '../creature.js';
import {
  along,
  cross,
  distanceToBox,
  dot,
  length,
  normalize,
  perAxis,
  sub,
} from './vec.js';

// Фигуры областей по глоссарию правил 2024. Все размеры — в клетках (футы / 5).
// Точка начала — любая точка: по книге на плоской сетке она стоит на пересечении
// линий (x и z целые), а высоту задаёт источник — привязку делает вызывающий код.
// «Входит ли точка начала в область» решает, задет ли сам создатель, — это выбор
// целей (этап 9), а не геометрия.
export type AreaShape =
  // Шар евклидова радиуса.
  | { shape: 'sphere'; origin: Point3; radius: number }
  // Куб по сетке: угол с наименьшими координатами и сторона. Точка начала — на грани.
  | { shape: 'cube'; origin: Point3; from: Vec3; size: number }
  // Точка начала — центр нижнего (up) или верхнего (down) круга.
  | {
      shape: 'cylinder';
      origin: Point3;
      radius: number;
      height: number;
      direction: 'up' | 'down';
    }
  // Ширина конуса на расстоянии t от точки начала равна t. В 3D конус круглый.
  | { shape: 'cone'; origin: Point3; direction: Point3; length: number }
  // В книге у линии только длина и ширина. Сечение в 3D — наше расширение:
  // квадрат width × width, одна сторона которого горизонтальна.
  | {
      shape: 'line';
      origin: Point3;
      direction: Point3;
      length: number;
      width: number;
    }
  // Всё, что ближе distance к телу существа или предмета (коробка со скруглениями).
  | { shape: 'emanation'; source: BodyBox; distance: number };

// Фигура, готовая к проверке точек: проверена один раз, а не на каждую точку.
export interface PreparedArea {
  origin: Point3;
  min: Point3;
  max: Point3;
  contains(p: Point3): boolean;
}

// Допуск, чтобы точки ровно на границе фигуры (углы клеток у куба) считались внутри.
const EPS = 1e-9;

function sphereLike(origin: Point3, radius: number): PreparedArea {
  return {
    origin,
    min: [origin[0] - radius, origin[1] - radius, origin[2] - radius],
    max: [origin[0] + radius, origin[1] + radius, origin[2] + radius],
    contains: (p) => length(sub(p, origin)) <= radius + EPS,
  };
}

function cube(origin: Point3, from: Vec3, size: number): PreparedArea {
  const max: Point3 = [from[0] + size, from[1] + size, from[2] + size];
  const inBox = (p: Point3) =>
    [0, 1, 2].every((a) => p[a] >= from[a] - EPS && p[a] <= max[a] + EPS);
  const onFace = [0, 1, 2].some(
    (a) =>
      Math.abs(origin[a] - from[a]) < EPS || Math.abs(origin[a] - max[a]) < EPS,
  );
  if (!inBox(origin) || !onFace) {
    throw new RangeError('Точка начала куба должна лежать на его грани');
  }
  return { origin, min: from, max, contains: inBox };
}

function cylinder(
  origin: Point3,
  radius: number,
  height: number,
  direction: 'up' | 'down',
): PreparedArea {
  const bottom = direction === 'up' ? origin[1] : origin[1] - height;
  return {
    origin,
    min: [origin[0] - radius, bottom, origin[2] - radius],
    max: [origin[0] + radius, bottom + height, origin[2] + radius],
    contains: (p) =>
      p[1] >= bottom - EPS &&
      p[1] <= bottom + height + EPS &&
      Math.hypot(p[0] - origin[0], p[2] - origin[2]) <= radius + EPS,
  };
}

function cone(origin: Point3, direction: Point3, len: number): PreparedArea {
  const dir = normalize(direction);
  // Габарит — вершина плюс круг основания радиуса len/2.
  const base = along(origin, dir, len);
  const spread = [0, 1, 2].map(
    (a) => (len / 2) * Math.sqrt(Math.max(0, 1 - dir[a] ** 2)),
  );
  return {
    origin,
    min: perAxis((a) => Math.min(origin[a], base[a] - spread[a])),
    max: perAxis((a) => Math.max(origin[a], base[a] + spread[a])),
    contains: (p) => {
      const rel = sub(p, origin);
      const t = dot(rel, dir);
      if (t < -EPS || t > len + EPS) return false;
      const radial = length(sub(rel, along([0, 0, 0], dir, t)));
      return radial <= t / 2 + EPS;
    },
  };
}

function line(
  origin: Point3,
  direction: Point3,
  len: number,
  width: number,
): PreparedArea {
  const dir = normalize(direction);
  // Горизонтальная ось сечения; у вертикальной линии берём ось x.
  const flat = cross(dir, [0, 1, 0]);
  const u = length(flat) < EPS ? ([1, 0, 0] as Point3) : normalize(flat);
  const v = cross(u, dir);
  const half = width / 2;
  const corners: Point3[] = [];
  for (const t of [0, len]) {
    for (const su of [-half, half]) {
      for (const sv of [-half, half]) {
        corners.push(along(along(along(origin, dir, t), u, su), v, sv));
      }
    }
  }
  return {
    origin,
    min: perAxis((a) => Math.min(...corners.map((c) => c[a]))),
    max: perAxis((a) => Math.max(...corners.map((c) => c[a]))),
    contains: (p) => {
      const rel = sub(p, origin);
      const t = dot(rel, dir);
      return (
        t >= -EPS &&
        t <= len + EPS &&
        Math.abs(dot(rel, u)) <= half + EPS &&
        Math.abs(dot(rel, v)) <= half + EPS
      );
    },
  };
}

function emanation(source: BodyBox, distance: number): PreparedArea {
  const { min, max } = source;
  return {
    // Лучи укрытия идут из центра тела источника.
    origin: perAxis((a) => (min[a] + max[a]) / 2),
    min: [min[0] - distance, min[1] - distance, min[2] - distance],
    max: [max[0] + distance, max[1] + distance, max[2] + distance],
    contains: (p) => distanceToBox(p, min, max) <= distance + EPS,
  };
}

export function prepareArea(area: AreaShape): PreparedArea {
  switch (area.shape) {
    case 'sphere':
      return sphereLike(area.origin, area.radius);
    case 'cube':
      return cube(area.origin, area.from, area.size);
    case 'cylinder':
      return cylinder(area.origin, area.radius, area.height, area.direction);
    case 'cone':
      return cone(area.origin, area.direction, area.length);
    case 'line':
      return line(area.origin, area.direction, area.length, area.width);
    case 'emanation':
      return emanation(area.source, area.distance);
  }
}
