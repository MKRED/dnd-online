import { describe, expect, it } from 'vitest';
import { CHUNK_VOLUME, localIndex } from '../../coords.js';
import { createMask, maskAdd, MASK_BYTES } from './cellMask.js';
import {
  creatureSeen,
  exploredCells,
  maskChunk,
  objectSeen,
  type FogMasks,
} from './fogView.js';

function fogWith(explored: [number, number, number][], visible = explored) {
  const fog: FogMasks = { explored: createMask(), visible: createMask() };
  for (const cell of explored) maskAdd(fog.explored, cell);
  for (const cell of visible) maskAdd(fog.visible, cell);
  return fog;
}

describe('objectSeen', () => {
  // Открыто [0..1], видно только [0].
  const fog = fogWith(
    [
      [0, 1, 0],
      [1, 1, 0],
    ],
    [[0, 1, 0]],
  );

  it('shows a creature only while it is seen', () => {
    expect(objectSeen({ kind: 'monster', at: [0, 1, 0] }, fog)).toBe(true);
    expect(objectSeen({ kind: 'npc', at: [1, 1, 0] }, fog)).toBe(false);
    expect(creatureSeen([1, 1, 0], fog)).toBe(false);
  });

  it('shows the rest while its cell is explored', () => {
    expect(objectSeen({ kind: 'container', at: [1, 1, 0] }, fog)).toBe(true);
    expect(objectSeen({ kind: 'item', at: [2, 1, 0] }, fog)).toBe(false);
  });

  it('shows everything with no fog', () => {
    expect(objectSeen({ kind: 'monster', at: [9, 9, 9] }, null)).toBe(true);
  });
});

describe('maskChunk', () => {
  const chunk = new Uint16Array(CHUNK_VOLUME);
  chunk[localIndex(0, 0, 0)] = 3;
  chunk[localIndex(5, 0, 5)] = 4;

  it('keeps explored blocks and turns the rest into air', () => {
    const fog = fogWith([[0, 0, 0]]);
    const masked = maskChunk(chunk, fog.explored.get('0,0,0'))!;
    expect(masked[localIndex(0, 0, 0)]).toBe(3);
    expect(masked[localIndex(5, 0, 5)]).toBe(0);
  });

  it('drops a chunk with no explored block', () => {
    expect(maskChunk(chunk, undefined)).toBeNull();
    const air = fogWith([[1, 0, 1]]);
    expect(maskChunk(chunk, air.explored.get('0,0,0'))).toBeNull();
    expect(maskChunk(chunk, new Uint8Array(MASK_BYTES))).toBeNull();
  });
});

describe('exploredCells', () => {
  it('keeps the packed cells inside the explored area', () => {
    const fog = fogWith([[1, 0, 1]]);
    const cells = [1, 0, 1, 0, 3, 6, 0, 6, 0, 3];
    expect(exploredCells(cells, fog.explored)).toEqual([1, 0, 1, 0, 3]);
  });
});
