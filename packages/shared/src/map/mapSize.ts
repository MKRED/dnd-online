import type { Box3 } from './coords.js';
import { MapOpError } from './mapOpError.js';
import type { MapState } from './mapState.js';

// Размер карты (docs/plan/done/map-editor.md, «Размер карты»): клетки 0 ≤ x < width,
// 0 ≤ z < depth, y ≥ 0. Высота у всех карт общая — предел maxHeight из конфига сервера.
export interface MapSize {
  width: number;
  depth: number;
}

export const DEFAULT_MAP_SIZE: MapSize = { width: 32, depth: 32 };

// Пределы, общие для всех карт: наибольшие ширина и глубина и число уровней.
export interface MapBoundsLimits {
  maxSize: number;
  maxHeight: number;
}

// Пределы по умолчанию: сервер берёт их, если MAP_MAX_SIZE и MAP_MAX_HEIGHT не заданы,
// веб — как подсказку в полях размера (окончательно проверяет сервер).
export const DEFAULT_MAP_LIMITS: MapBoundsLimits = {
  maxSize: 256,
  maxHeight: 64,
};

// Карта, которую правят операциями: к блокам добавлен её размер.
export interface SizedMapState extends MapState {
  size: MapSize;
}

export function sizeLabel({ width, depth }: MapSize): string {
  return `${width} × ${depth}`;
}

// Клетка внутри карты (по высоте — только снизу: верх у карты динамический).
export function insideMap([x, y, z]: readonly number[], size: MapSize) {
  return x >= 0 && y >= 0 && z >= 0 && x < size.width && z < size.depth;
}

export function sameSize(a: MapSize, b: MapSize): boolean {
  return a.width === b.width && a.depth === b.depth;
}

// Отрицательные координаты и высоту отсекает уже разбор операции (parseMapOp),
// здесь — только размер этой карты: он известен лишь под блокировкой карты.
export function assertInsideMap({ min, max }: Box3, size: MapSize) {
  if (max[0] < size.width && max[2] < size.depth) return;
  const where = min.every((v, axis) => v === max[axis])
    ? `Клетка [${min.join(', ')}]`
    : `Область [${min.join(', ')}] – [${max.join(', ')}]`;
  throw new MapOpError(
    `${where} за границей карты ${sizeLabel(size)} (x от 0 до ${size.width - 1}, z от 0 до ${size.depth - 1})`,
  );
}
