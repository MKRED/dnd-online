import { describe, expect, it } from 'vitest';
import { BASE_BLOCKS, createBlockCatalog } from 'shared';
import {
  ATLAS_HEIGHT,
  ATLAS_WIDTH,
  atlasFor,
  atlasUv,
  BlockAtlas,
  materialSet,
} from './atlas';
import { materialTextures, type MaterialTextures } from './materialTextures';
import { paintTile } from './pixels';

// Пиксель (x, y) плитки набора: середина пикселя в UV — и обратно в индекс данных.
function pixelAt(
  atlas: BlockAtlas,
  set: number,
  face: 'top' | 'side',
  x: number,
  y: number,
) {
  const [u, v] = atlasUv(set, face, (x + 0.5) / 16, (y + 0.5) / 16);
  const at =
    (Math.floor(v * ATLAS_HEIGHT) * ATLAS_WIDTH + Math.floor(u * ATLAS_WIDTH)) *
    4;
  return [...atlas.pixels.subarray(at, at + 4)];
}

const flat = (r: number, a = 255): MaterialTextures => {
  const tile = paintTile(() => [r, 0, 0, a]);
  return { top: tile, side: tile, bottom: tile };
};

describe('atlas', () => {
  it('puts every tile at its own place inside the atlas', () => {
    const corners = new Set<string>();
    for (const material of ['stone', 'grass', 'water'] as const) {
      for (const face of ['top', 'side', 'bottom'] as const) {
        const set = materialSet(material);
        const [u0, v0] = atlasUv(set, face, 0, 0);
        const [u1, v1] = atlasUv(set, face, 1, 1);
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
    const [, top] = atlasUv(materialSet('grass'), 'side', 0.5, 0);
    const [, bottom] = atlasUv(materialSet('grass'), 'side', 0.5, 1);
    expect(top).toBeGreaterThan(bottom);
  });

  it('copies the base tiles to where atlasUv points', () => {
    const atlas = new BlockAtlas();
    const tile = materialTextures('brick').top;
    const from = (5 * 16 + 3) * 4;
    expect(pixelAt(atlas, materialSet('brick'), 'top', 3, 5)).toEqual([
      ...tile.subarray(from, from + 4),
    ]);
  });

  it('gives a group its own place once and bumps the version', () => {
    const atlas = new BlockAtlas();
    const first = atlas.setFor('a', () => flat(200));
    expect(first?.set).toBeGreaterThan(materialSet('leaves'));
    expect(atlas.version).toBe(1);
    // Повторно — то же место, плитки не перерисовываются.
    expect(atlas.setFor('a', () => flat(10))).toBe(first);
    expect(atlas.version).toBe(1);
    expect(pixelAt(atlas, first!.set, 'side', 0, 0)).toEqual([200, 0, 0, 255]);
    expect(first?.holes).toBe(false);
    expect(atlas.setFor('b', () => flat(50, 0))?.holes).toBe(true);
  });

  it('runs out of places instead of overwriting tiles', () => {
    const atlas = new BlockAtlas();
    let last = atlas.setFor('g0', () => flat(1));
    for (let i = 1; last; i++) last = atlas.setFor(`g${i}`, () => flat(1));
    expect(last).toBeNull();
  });

  it('keeps one atlas per catalog', () => {
    const catalog = createBlockCatalog([]);
    // Сравниваем ссылки, а не expect(atlas).toBe: на провале vitest печатал бы разницу
    // мегабайтных пикселей.
    expect(atlasFor(BASE_BLOCKS) === atlasFor(catalog)).toBe(true);
    const other = createBlockCatalog([
      {
        id: '0b5c6f2e-8a1d-4c3b-9e7f-1a2b3c4d5e6f',
        name: 'Угли',
        look: 'scorched',
        color: '#552211',
        opaque: true,
        durability: null,
        flammable: false,
        movementCost: 1,
        climbable: false,
        hazard: null,
        textures: null,
        shapes: {},
      },
    ]);
    expect(atlasFor(other) === atlasFor(BASE_BLOCKS)).toBe(false);
  });
});
