import type { Point3 } from '../creature.js';

// Минимум векторной арифметики для фигур областей.

export function sub(a: Point3, b: Point3): Point3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function dot(a: Point3, b: Point3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross(a: Point3, b: Point3): Point3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function length(a: Point3): number {
  return Math.hypot(a[0], a[1], a[2]);
}

export function normalize(a: Point3): Point3 {
  const len = length(a);
  if (len === 0)
    throw new RangeError('Направление области не может быть нулевым');
  return [a[0] / len, a[1] / len, a[2] / len];
}

export function along(origin: Point3, dir: Point3, t: number): Point3 {
  return [
    origin[0] + dir[0] * t,
    origin[1] + dir[1] * t,
    origin[2] + dir[2] * t,
  ];
}

export function perAxis(fn: (axis: 0 | 1 | 2) => number): Point3 {
  return [fn(0), fn(1), fn(2)];
}

// Расстояние от точки до коробки (0 — внутри).
export function distanceToBox(p: Point3, min: Point3, max: Point3): number {
  return length(perAxis((a) => Math.max(min[a] - p[a], 0, p[a] - max[a])));
}
