import { describe, expect, it } from 'vitest';
import { applyChangeset } from './changeset.js';
import { MemoryChunkStore, type ChunkStore } from './chunkStore.js';
import type { MapState } from './mapState.js';
import { MapOpError } from './ops.js';
import { applyOps, parseMapOpBatch } from './opsBatch.js';
import { createPalette } from './palette.js';

const limits = {
  maxOpVolume: 100,
  maxCoordinate: 1000,
  maxOpsPerBatch: 3,
  maxBatchVolume: 150,
};

function emptyMap(): MapState {
  return { store: new MemoryChunkStore(), palette: createPalette() };
}

function snapshot(store: ChunkStore) {
  return new Map(
    [...store.keys()].map((key) => [key, Array.from(store.get(key) ?? [])]),
  );
}

describe('parseMapOpBatch', () => {
  it('указывает номер ошибочной операции', () => {
    const input = [
      { op: 'setBlock', at: [0, 0, 0], block: 'stone' },
      { op: 'setBlock', at: [0, 0, 0], block: 'mithril' },
    ];
    expect(() => parseMapOpBatch(input, limits)).toThrow('Операция №2');
  });

  it.each([
    ['пустой список', []],
    ['не список', { op: 'setBlock' }],
    [
      'слишком много операций',
      Array.from({ length: 4 }, () => ({
        op: 'setBlock',
        at: [0, 0, 0],
        block: 'stone',
      })),
    ],
    [
      'суммарный объём больше лимита',
      Array.from({ length: 2 }, () => ({
        op: 'fillBox',
        from: [0, 0, 0],
        to: [9, 0, 9],
        block: 'stone',
      })),
    ],
  ])('отклоняет: %s', (_, input) => {
    expect(() => parseMapOpBatch(input, limits)).toThrow(MapOpError);
  });
});

describe('applyOps', () => {
  it('сливает изменения одной клетки и выбрасывает вернувшиеся к исходному', () => {
    const map = emptyMap();
    const changes = applyOps(map, [
      { op: 'fillBox', from: [0, 0, 0], to: [2, 0, 0], block: 'stone' },
      { op: 'setBlock', at: [1, 0, 0], block: 'wood' },
      { op: 'setBlock', at: [2, 0, 0], block: 'air' },
    ]);

    expect(changes.cells).toHaveLength(2);
    expect(changes.paletteAdded.map((p) => p.name)).toEqual(['stone', 'wood']);
  });

  it('откат пачки одним changeset возвращает карту к состоянию до неё', () => {
    const map = emptyMap();
    applyOps(map, [
      { op: 'fillBox', from: [-4, 0, -4], to: [4, 0, 4], block: 'grass' },
    ]);
    const before = snapshot(map.store);

    const changes = applyOps(map, [
      { op: 'hollowBox', from: [-2, 0, -2], to: [2, 3, 2], block: 'brick' },
      { op: 'setBlock', at: [0, 1, -2], block: 'air' },
      {
        op: 'replace',
        from: [-4, 0, -4],
        to: [4, 0, 4],
        match: 'grass',
        block: 'dirt',
      },
    ]);
    applyChangeset(map, changes, 'backward');

    expect(snapshot(map.store)).toEqual(before);
  });
});
