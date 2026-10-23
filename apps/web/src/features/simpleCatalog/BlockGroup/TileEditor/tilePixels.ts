import { TILE_SIZE, type Tile } from '../../../maps';

// Правка пикселей плитки 16×16 в редакторе текстур (docs/plan/blocks.md, этап 5).
// Плитка не меняется на месте: каждая правка отдаёт новую, чтобы история отмены
// хранила снимки, а React видел смену.

// Цвет пикселя: '#rrggbb' или null — прозрачный (дыра насквозь, как у листвы).
export type PixelColor = string | null;

const index = (x: number, y: number) => (y * TILE_SIZE + x) * 4;

const inside = (x: number, y: number) =>
  x >= 0 && y >= 0 && x < TILE_SIZE && y < TILE_SIZE;

const hex = (value: number) => value.toString(16).padStart(2, '0');

export function pixelAt(tile: Tile, x: number, y: number): PixelColor {
  const i = index(x, y);
  // Полупрозрачных пикселей у своих текстур нет: всё, что меньше половины, — дыра
  // (так же режет alphaTest на карте, этап 4б).
  if (tile[i + 3] < 128) return null;
  return `#${hex(tile[i])}${hex(tile[i + 1])}${hex(tile[i + 2])}`;
}

function write(tile: Tile, x: number, y: number, color: PixelColor) {
  const i = index(x, y);
  if (color === null) {
    tile.set([0, 0, 0, 0], i);
    return;
  }
  tile.set(
    [1, 3, 5].map((at) => parseInt(color.slice(at, at + 2), 16)),
    i,
  );
  tile[i + 3] = 255;
}

// Точки отрезка между двумя пикселями (Брезенхэм): при быстром движении мыши события
// приходят реже, чем пиксели под курсором, и без этого линия шла бы пунктиром.
export function linePoints(
  from: [number, number],
  to: [number, number],
): [number, number][] {
  const [x1, y1] = to;
  let [x, y] = from;
  const dx = Math.abs(x1 - x);
  const dy = -Math.abs(y1 - y);
  const sx = x < x1 ? 1 : -1;
  const sy = y < y1 ? 1 : -1;
  let error = dx + dy;
  const points: [number, number][] = [[x, y]];
  while (x !== x1 || y !== y1) {
    const e2 = 2 * error;
    if (e2 >= dy) {
      error += dy;
      x += sx;
    }
    if (e2 <= dx) {
      error += dx;
      y += sy;
    }
    points.push([x, y]);
  }
  return points;
}

export function paintPixels(
  tile: Tile,
  points: [number, number][],
  color: PixelColor,
): Tile {
  const next = new Uint8ClampedArray(tile);
  for (const [x, y] of points) if (inside(x, y)) write(next, x, y, color);
  return next;
}

// Заливка связной области одного цвета (соседи по сторонам, без диагоналей —
// иначе заливка протекает сквозь тонкую диагональную линию).
export function floodFill(
  tile: Tile,
  x: number,
  y: number,
  color: PixelColor,
): Tile {
  const target = pixelAt(tile, x, y);
  if (target === color) return tile;
  const next = new Uint8ClampedArray(tile);
  const stack: [number, number][] = [[x, y]];
  while (stack.length > 0) {
    const [px, py] = stack.pop()!;
    if (!inside(px, py) || pixelAt(next, px, py) !== target) continue;
    write(next, px, py, color);
    stack.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
  }
  return next;
}

// Цвета плитки по частоте — «Цвета плитки» в палитре: чтобы дорисовывать теми же.
export function tileColors(tile: Tile, limit: number): string[] {
  const counts = new Map<string, number>();
  for (let y = 0; y < TILE_SIZE; y++)
    for (let x = 0; x < TILE_SIZE; x++) {
      const color = pixelAt(tile, x, y);
      if (color) counts.set(color, (counts.get(color) ?? 0) + 1);
    }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([color]) => color);
}
