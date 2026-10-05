import { describe, expect, it } from 'vitest';
import { applyOp } from '../applyOp.js';
import { MemoryChunkStore } from '../chunkStore.js';
import type { MapState } from '../mapState.js';
import { createPalette } from '../palette.js';
import { creatureBody } from './creature.js';

function emptyMap(): MapState {
  return { store: new MemoryChunkStore(), palette: createPalette() };
}

describe('creatureBody', () => {
  it('Средний на земле — клетка основания и 2 блока роста', () => {
    expect(creatureBody(emptyMap(), [3, 1, -2], 'medium')).toEqual({
      min: [3, 1, -2],
      max: [4, 3, -1],
    });
  });

  it('на плите и ступенях стоит на полблока выше, рядом с тонкой стеной — на дне', () => {
    const map = emptyMap();
    applyOp(map, { op: 'setBlock', at: [0, 0, 0], block: 'wood_slab' });
    applyOp(map, { op: 'setBlock', at: [5, 0, 0], block: 'wood_stairs' });
    applyOp(map, { op: 'setBlock', at: [8, 0, 0], block: 'wood_wall' });
    expect(creatureBody(map, [0, 0, 0], 'medium').min[1]).toBe(0.5);
    expect(creatureBody(map, [0, 0, 0], 'medium').max[1]).toBe(2.5);
    expect(creatureBody(map, [5, 0, 0], 'small').min[1]).toBe(0.5);
    expect(creatureBody(map, [8, 0, 0], 'small').min[1]).toBe(0);
  });

  it('Большой занимает 2×2 и стоит на самой высокой опоре основания', () => {
    const map = emptyMap();
    applyOp(map, { op: 'setBlock', at: [1, 0, 1], block: 'stone_slab' });
    expect(creatureBody(map, [0, 0, 0], 'large')).toEqual({
      min: [0, 0.5, 0],
      max: [2, 3.5, 2],
    });
  });

  it('Крошечный — в середине клетки; рост можно переопределить', () => {
    expect(creatureBody(emptyMap(), [0, 0, 0], 'tiny')).toEqual({
      min: [0.25, 0, 0.25],
      max: [0.75, 1, 0.75],
    });
    expect(creatureBody(emptyMap(), [0, 0, 0], 'medium', 3).max[1]).toBe(3);
  });
});
