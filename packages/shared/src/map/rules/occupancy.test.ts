import { describe, expect, it } from 'vitest';
import { applyOp } from '../applyOp.js';
import { MemoryChunkStore } from '../chunkStore.js';
import type { MapState } from '../mapState.js';
import { createPalette } from '../palette.js';
import { occupantsAt, type Occupant } from './occupancy.js';

// Пол под y = 0 и второй этаж — плита-пол на y = 3 над x = 0…3.
function twoFloors(): MapState {
  const map = { store: new MemoryChunkStore(), palette: createPalette() };
  applyOp(map, {
    op: 'fillBox',
    from: [-4, -1, -4],
    to: [6, -1, 6],
    block: 'dirt',
  });
  applyOp(map, {
    op: 'fillBox',
    from: [0, 3, 0],
    to: [3, 3, 3],
    block: 'stone',
  });
  return map;
}

const goblin: Occupant = { at: [1, 0, 1], size: 'medium', ally: false };

describe('occupantsAt', () => {
  it('та же клетка занята, соседняя — нет', () => {
    const map = twoFloors();
    expect(occupantsAt(map, [1, 0, 1], 'medium', [goblin])).toEqual([goblin]);
    expect(occupantsAt(map, [2, 0, 1], 'medium', [goblin])).toEqual([]);
  });

  it('Большой занимает 2×2: любая клетка его места занята', () => {
    const ogre: Occupant = { at: [1, 0, 1], size: 'large', ally: false };
    const map = twoFloors();
    expect(occupantsAt(map, [2, 0, 2], 'medium', [ogre])).toEqual([ogre]);
    expect(occupantsAt(map, [3, 0, 1], 'medium', [ogre])).toEqual([]);
  });

  it('существо этажом выше место под собой не занимает', () => {
    const upstairs: Occupant = { at: [1, 4, 1], size: 'medium', ally: false };
    const map = twoFloors();
    expect(occupantsAt(map, [1, 0, 1], 'medium', [upstairs])).toEqual([]);
  });
});
