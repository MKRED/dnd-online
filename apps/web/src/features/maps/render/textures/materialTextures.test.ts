import { MATERIALS, type MaterialName } from 'shared';
import { describe, expect, it } from 'vitest';
import { materialTextures } from './materialTextures';
import { hexToRgb, TILE_SIZE } from './pixels';

const MATERIAL_NAMES = Object.keys(MATERIALS) as MaterialName[];

// Средний цвет без сквозных пикселей (дыры листвы цвета не имеют).
function meanColor(tile: Uint8ClampedArray): number[] {
  const sum = [0, 0, 0];
  let count = 0;
  for (let i = 0; i < tile.length; i += 4) {
    if (tile[i + 3] === 0) continue;
    for (let c = 0; c < 3; c++) sum[c] += tile[i + c];
    count++;
  }
  return sum.map((value) => value / count);
}

describe('materialTextures', () => {
  it.each(MATERIAL_NAMES)(
    '%s: 16 × 16 tiles drawn the same way every time',
    (material) => {
      const first = materialTextures(material);
      expect(first.top).toHaveLength(TILE_SIZE * TILE_SIZE * 4);
      expect(materialTextures(material).top).toEqual(first.top);
    },
  );

  it.each(MATERIAL_NAMES.filter((name) => name !== 'glass'))(
    '%s: the top looks like the base colour from afar',
    (material) => {
      const base = hexToRgb(MATERIALS[material].color);
      const mean = meanColor(materialTextures(material).top);
      // Сдвиг среднего обрезается на 0 и 255 — допускаем пару единиц. У огня и лавы
      // жёлтые сгустки упираются в 255 почти всем красным каналом — им запас больше.
      const tolerance = material === 'fire' || material === 'lava' ? 30 : 4;
      mean.forEach((value, c) =>
        expect(Math.abs(value - base[c])).toBeLessThan(tolerance),
      );
    },
  );

  it('gives grass a turf top, a fringed side and a dirt bottom', () => {
    const grass = materialTextures('grass');
    expect(grass.side).not.toEqual(grass.top);
    expect(grass.bottom).not.toEqual(grass.side);
    // Верхний ряд бока — дёрн (зелёный канал сильнее красного), нижний — земля.
    const [r0, g0] = grass.side;
    const last = TILE_SIZE * (TILE_SIZE - 1) * 4;
    expect(g0).toBeGreaterThan(r0);
    expect(grass.side[last + 1]).toBeLessThan(grass.side[last]);
  });

  it('gives a path a trodden top and a dirt side with its rim on top', () => {
    const path = materialTextures('path');
    const dirt = materialTextures('dirt');
    expect(path.side).not.toEqual(path.top);
    expect(path.bottom).toEqual(dirt.top);
    // Верхний ряд бока — край тропы, он светлее земли.
    expect(path.side[0]).toBeGreaterThan(path.side[TILE_SIZE * 8 * 4]);
  });

  it('cuts holes through leaves and keeps the rest solid', () => {
    const { top } = materialTextures('leaves');
    const alphas = top.filter((_, i) => i % 4 === 3);
    const holes = alphas.filter((alpha) => alpha === 0).length;
    expect(holes).toBeGreaterThan(10);
    expect(holes).toBeLessThan(80);
    expect(alphas.every((alpha) => alpha === 0 || alpha === 255)).toBe(true);
  });

  it('keeps glass see-through in the middle and solid at the frame', () => {
    const { top } = materialTextures('glass');
    const middle = (8 * TILE_SIZE + 2) * 4 + 3;
    expect(top[3]).toBeGreaterThan(200);
    expect(top[middle]).toBeLessThan(80);
  });
});
