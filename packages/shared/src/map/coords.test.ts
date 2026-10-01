import { describe, expect, it } from 'vitest';
import {
  boxFromCorners,
  boxVolume,
  cellFromChunk,
  cellLocation,
  chunkCoordOf,
  chunkKeysInBox,
  localCoordOf,
  parseChunkKey,
  type Vec3,
} from './coords.js';

describe('координаты чанков', () => {
  it('отрицательные координаты попадают в предыдущий чанк с неотрицательным локальным индексом', () => {
    expect(chunkCoordOf(-1)).toBe(-1);
    expect(localCoordOf(-1)).toBe(15);
    expect(chunkCoordOf(-16)).toBe(-1);
    expect(localCoordOf(-16)).toBe(0);
    expect(chunkCoordOf(-17)).toBe(-2);
    expect(localCoordOf(-17)).toBe(15);
  });

  it('положительные координаты и граница чанка', () => {
    expect(chunkCoordOf(15)).toBe(0);
    expect(localCoordOf(15)).toBe(15);
    expect(chunkCoordOf(16)).toBe(1);
    expect(localCoordOf(16)).toBe(0);
  });

  it('cellFromChunk обратна cellLocation, в том числе для отрицательных клеток', () => {
    const cells: Vec3[] = [
      [0, 0, 0],
      [-1, -1, -1],
      [17, -33, 5],
      [-16, 15, -100],
    ];
    for (const cell of cells) {
      const { key, index } = cellLocation(cell);
      expect(cellFromChunk(parseChunkKey(key), index)).toEqual(cell);
    }
  });

  it('-0 не порождает отдельный ключ чанка', () => {
    expect(cellLocation([-0, 0, 0]).key).toBe(cellLocation([0, 0, 0]).key);
  });
});

describe('области', () => {
  it('boxFromCorners принимает углы в любом порядке', () => {
    expect(boxFromCorners([5, 0, -2], [1, 3, 4])).toEqual({
      min: [1, 0, -2],
      max: [5, 3, 4],
    });
  });

  it('объём считается включительно', () => {
    expect(boxVolume({ min: [0, 0, 0], max: [0, 0, 0] })).toBe(1);
    expect(boxVolume({ min: [-1, 0, 0], max: [1, 1, 2] })).toBe(18);
  });

  it('chunkKeysInBox перечисляет чанки через ноль', () => {
    const keys = chunkKeysInBox({ min: [-1, 0, 0], max: [16, 0, 0] });
    expect(keys).toEqual(['-1,0,0', '0,0,0', '1,0,0']);
  });
});
