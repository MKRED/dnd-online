import type { MaterialTextures } from './materialTextures';
import { TILE_SIZE, type Tile } from './pixels';

// Загруженная картинка → плитка 16×16 (docs/plan/blocks.md, этап 4б). Без canvas, чтобы
// проверялось тестами: картинка обрезается по центру до квадрата, и каждый пиксель
// плитки — среднее своего квадрата исходных пикселей с весом по площади (картинка
// 64×64 из пиксель-арта сжимается точно, по 4×4). Цвет усредняется с весом альфы,
// иначе прозрачные края темнили бы плитку. Альфа — только 0 или 255: дыры, как у
// листвы, полупрозрачности у своих текстур нет.
export function downscaleTile(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): Tile {
  const side = Math.min(width, height);
  const left = (width - side) / 2;
  const top = (height - side) / 2;
  const step = side / TILE_SIZE;
  const tile = new Uint8ClampedArray(TILE_SIZE * TILE_SIZE * 4);
  for (let ty = 0; ty < TILE_SIZE; ty++) {
    for (let tx = 0; tx < TILE_SIZE; tx++) {
      const x0 = left + tx * step;
      const y0 = top + ty * step;
      let r = 0;
      let g = 0;
      let b = 0;
      let alpha = 0;
      let area = 0;
      for (let y = Math.floor(y0); y < Math.ceil(y0 + step); y++) {
        const wy = Math.min(y + 1, y0 + step) - Math.max(y, y0);
        for (let x = Math.floor(x0); x < Math.ceil(x0 + step); x++) {
          const wx = Math.min(x + 1, x0 + step) - Math.max(x, x0);
          const w = wx * wy;
          if (w <= 0) continue;
          const at = (y * width + x) * 4;
          const a = rgba[at + 3] / 255;
          r += rgba[at] * a * w;
          g += rgba[at + 1] * a * w;
          b += rgba[at + 2] * a * w;
          alpha += a * w;
          area += w;
        }
      }
      const out = (ty * TILE_SIZE + tx) * 4;
      if (alpha > 0) tile.set([r / alpha, g / alpha, b / alpha], out);
      tile[out + 3] = alpha / area >= 0.5 ? 255 : 0;
    }
  }
  return tile;
}

// Средний цвет непрозрачных пикселей всех граней — основной цвет группы по умолчанию.
export function meanTextureColor(textures: MaterialTextures): string {
  const sum = [0, 0, 0];
  let count = 0;
  for (const tile of [textures.top, textures.side, textures.bottom]) {
    for (let i = 0; i < tile.length; i += 4) {
      if (tile[i + 3] === 0) continue;
      sum[0] += tile[i];
      sum[1] += tile[i + 1];
      sum[2] += tile[i + 2];
      count++;
    }
  }
  if (count === 0) return '#808080';
  const hex = sum.map((value) =>
    Math.round(value / count)
      .toString(16)
      .padStart(2, '0'),
  );
  return `#${hex.join('')}`;
}
