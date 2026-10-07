import { reachable } from 'shared';
import { describe, expect, it } from 'vitest';
import { reachTiles } from './reachTiles';
import { floorWith } from './testMap';

describe('reachTiles', () => {
  it('плитка на уровне ног: на плите — на полблока выше', () => {
    const map = floorWith({
      op: 'setBlock',
      at: [1, 0, 0],
      block: 'stone_slab',
    });
    const tiles = reachTiles(
      map,
      reachable(map, [0, 0, 0], 'medium', 5),
      'medium',
    );
    expect(tiles).toHaveLength(9);
    expect(tiles).toContainEqual({ at: [0, 0, 0], cost: 0 });
    expect(tiles).toContainEqual({ at: [1, 0.5, 0], cost: 5 });
  });

  it('у Огромного плитка — середина основания', () => {
    const map = floorWith();
    const tiles = reachTiles(
      map,
      reachable(map, [-1, 0, -1], 'huge', 0),
      'huge',
    );
    expect(tiles).toEqual([{ at: [0, 0, 0], cost: 0 }]);
  });

  it('у Большого — средние 2×2 основания: и клетка у стены с +x', () => {
    // Стена по x = 2: Большой стоит в x 0…1, вплотную к ней.
    const map = floorWith({
      op: 'fillBox',
      from: [2, 0, -6],
      to: [2, 2, 6],
      block: 'stone',
    });
    const tiles = reachTiles(
      map,
      reachable(map, [0, 0, 0], 'large', 0),
      'large',
    );
    expect(tiles).toHaveLength(4);
    expect(tiles).toContainEqual({ at: [1, 0, 1], cost: 0 });
  });

  it('клетку из нескольких позиций красит самая дешёвая', () => {
    const map = floorWith();
    const tiles = reachTiles(
      map,
      reachable(map, [0, 0, 0], 'large', 5),
      'large',
    );
    // Позиции −1…1 по каждой оси, их середины 2×2 — клетки −1…2.
    expect(tiles).toHaveLength(16);
    expect(tiles.filter((t) => t.cost === 0)).toHaveLength(4);
  });

  it('клетки над пустотой не подсвечены, даже если тело над ними', () => {
    // Уступ высотой 1 шириной в клетку (x = 0) и стена за ним (x = 1): Большой
    // стоит на уступе, свесившись на запад, над клетками x = −1.
    const map = floorWith(
      { op: 'fillBox', from: [0, 0, -2], to: [0, 0, 2], block: 'stone' },
      { op: 'fillBox', from: [1, 0, -2], to: [1, 4, 2], block: 'stone' },
    );
    const tiles = reachTiles(
      map,
      reachable(map, [-1, 1, 0], 'large', 0),
      'large',
    );
    expect(tiles).toEqual([
      { at: [0, 1, 0], cost: 0 },
      { at: [0, 1, 1], cost: 0 },
    ]);
  });

  it('плитка — на опоре своей клетки: у Большого рядом с плитой не висит', () => {
    // Плита в клетке (1, 0, 1): ноги Большого на +½, но остальные клетки — пол.
    const map = floorWith({
      op: 'setBlock',
      at: [1, 0, 1],
      block: 'stone_slab',
    });
    const tiles = reachTiles(
      map,
      reachable(map, [0, 0, 0], 'large', 0),
      'large',
    );
    expect(tiles).toHaveLength(4);
    expect(tiles).toContainEqual({ at: [0, 0, 0], cost: 0 });
    expect(tiles).toContainEqual({ at: [1, 0.5, 1], cost: 0 });
  });
});
