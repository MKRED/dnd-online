import { describe, expect, it } from 'vitest';
import { ATLAS_HEIGHT, ATLAS_WIDTH, atlasPixels, atlasUv } from './atlas';
import { materialTextures } from './materialTextures';

describe('atlas', () => {
  it('puts every tile at its own place inside the atlas', () => {
    const corners = new Set<string>();
    for (const material of ['stone', 'grass', 'water'] as const) {
      for (const face of ['top', 'side', 'bottom'] as const) {
        const [u0, v0] = atlasUv(material, face, 0, 0);
        const [u1, v1] = atlasUv(material, face, 1, 1);
        for (const value of [u0, v0, u1, v1]) {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(1);
        }
        corners.add(`${u0},${v0}`);
      }
    }
    expect(corners.size).toBe(9);
  });

  it('stores the top row of a tile higher in the texture (v grows up)', () => {
    const [, top] = atlasUv('grass', 'side', 0.5, 0);
    const [, bottom] = atlasUv('grass', 'side', 0.5, 1);
    expect(top).toBeGreaterThan(bottom);
  });

  it('copies the tile pixels to where atlasUv points', () => {
    const atlas = atlasPixels();
    const tile = materialTextures('brick').top;
    // Пиксель (3, 5) плитки: середина пикселя в UV — и обратно в индекс данных.
    const [u, v] = atlasUv('brick', 'top', 3.5 / 16, 5.5 / 16);
    const x = Math.floor(u * ATLAS_WIDTH);
    const y = Math.floor(v * ATLAS_HEIGHT);
    const at = (y * ATLAS_WIDTH + x) * 4;
    const from = (5 * 16 + 3) * 4;
    expect([...atlas.subarray(at, at + 4)]).toEqual([
      ...tile.subarray(from, from + 4),
    ]);
  });
});
