import { describe, expect, it } from 'vitest';
import { faceKind, faceUvs } from './faceUv';
import { atlasUv, materialSet } from './textures/atlas';

const STONE = materialSet('stone');
const GRASS = materialSet('grass');

describe('faceUvs', () => {
  it('picks the top, bottom or side tile by the face normal', () => {
    expect(faceKind(1, 1)).toBe('top');
    expect(faceKind(1, -1)).toBe('bottom');
    expect(faceKind(0, 1)).toBe('side');
    expect(faceKind(2, -1)).toBe('side');
  });

  it('maps a slab side onto the lower half of the tile', () => {
    // Южная грань плиты высотой 0.5 в клетке (2, 3, 4).
    const corners: [number, number, number][] = [
      [2, 3, 5],
      [3, 3, 5],
      [3, 3.5, 5],
      [2, 3.5, 5],
    ];
    const uvs = faceUvs([2, 3, 4], corners, 2, 1, STONE);
    expect(uvs.slice(0, 2)).toEqual(atlasUv(STONE, 'side', 0, 1));
    expect(uvs.slice(4, 6)).toEqual(atlasUv(STONE, 'side', 1, 0.5));
  });

  it('keeps the top of a side tile at the top of the block on every side', () => {
    for (const [axis, side] of [
      [0, 1],
      [0, -1],
      [2, 1],
      [2, -1],
    ] as const) {
      const low: [number, number, number] = [0, 0, 0];
      const high: [number, number, number] = [0, 1, 0];
      const [, , , vLow, , vHigh] = [
        ...faceUvs([0, 0, 0], [low], axis, side, GRASS),
        ...faceUvs([0, 0, 0], [high], axis, side, GRASS),
      ].flatMap((value, i) => (i % 2 ? [0, 0, value] : []));
      expect(vHigh).toBeGreaterThan(vLow);
    }
  });
});
