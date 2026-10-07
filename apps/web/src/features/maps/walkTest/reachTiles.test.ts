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
});
