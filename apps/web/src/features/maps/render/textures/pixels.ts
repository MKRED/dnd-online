// Плитка текстуры блока: 16 × 16 пикселей RGBA, строка 0 — верх картинки
// (docs/plan/blocks.md, «Решения»: пиксельный стиль, 16 × 16).
export const TILE_SIZE = 16;

export type Rgb = [number, number, number];
export type Rgba = [number, number, number, number];
export type Tile = Uint8ClampedArray;

export function paintTile(pixel: (x: number, y: number) => Rgb | Rgba): Tile {
  const tile = new Uint8ClampedArray(TILE_SIZE * TILE_SIZE * 4);
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const [r, g, b, a = 255] = pixel(x, y);
      tile.set([r, g, b, a], (y * TILE_SIZE + x) * 4);
    }
  }
  return tile;
}

export function hexToRgb(hex: string): Rgb {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
}

// Яркость цвета множителем: 1 — как есть, меньше — темнее.
export function scale([r, g, b]: Rgb, k: number): Rgb {
  return [r * k, g * k, b * k];
}

export function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

// Средний цвет плитки сдвигается к основному цвету материала. Основной цвет — тот,
// что был у блока до текстур: им рисуются серая зона тумана, значок в каталоге и
// будущий режим без текстур, поэтому издали блок должен выглядеть так же.
export function matchMean(tile: Tile, target: Rgb): Tile {
  const sum = [0, 0, 0];
  let count = 0;
  for (let i = 0; i < tile.length; i += 4) {
    if (tile[i + 3] === 0) continue;
    for (let c = 0; c < 3; c++) sum[c] += tile[i + c];
    count++;
  }
  if (count === 0) return tile;
  const shift = sum.map((value, c) => target[c] - value / count);
  const result = new Uint8ClampedArray(tile);
  for (let i = 0; i < result.length; i += 4) {
    for (let c = 0; c < 3; c++) result[i + c] = tile[i + c] + shift[c];
  }
  return result;
}
