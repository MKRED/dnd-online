import { describe, expect, it } from 'vitest';
import { applyOp } from './applyOp.js';
import { renderAsciiSlice } from './asciiSlice.js';
import { applyChangeset } from './changeset.js';
import { MemoryChunkStore, type ChunkStore } from './chunkStore.js';
import type { MapState } from './mapState.js';
import { MapOpError } from './ops.js';
import { createPalette } from './palette.js';

function emptyMap(): MapState {
  return { store: new MemoryChunkStore(), palette: createPalette() };
}

function snapshot(store: ChunkStore) {
  return new Map(
    [...store.keys()].map((key) => [key, Array.from(store.get(key) ?? [])]),
  );
}

const region = { minX: -3, maxX: 5, minZ: -3, maxZ: 5 };

describe('applyChangeset', () => {
  it('backward возвращает карту в исходное состояние, forward повторяет изменения', () => {
    const map = emptyMap();
    applyOp(map, {
      op: 'fillBox',
      from: [0, 0, 0],
      to: [5, 2, 5],
      block: 'grass',
    });
    const before = snapshot(map.store);

    const changes = applyOp(map, {
      op: 'hollowBox',
      from: [-3, 0, -3],
      to: [3, 3, 3],
      block: 'stone',
    });
    const after = snapshot(map.store);

    expect(applyChangeset(map, changes, 'backward').conflicts).toEqual([]);
    expect(snapshot(map.store)).toEqual(before);

    expect(applyChangeset(map, changes, 'forward').conflicts).toEqual([]);
    expect(snapshot(map.store)).toEqual(after);
  });

  it('клиент с палитрой до операции получает ту же карту, что и сервер', () => {
    const server = emptyMap();
    const client = emptyMap();
    const first = applyOp(server, {
      op: 'setBlock',
      at: [0, 1, 0],
      block: 'stone',
    });
    applyChangeset(client, first, 'forward');

    const second = applyOp(server, {
      op: 'fillBox',
      from: [-2, 1, -2],
      to: [2, 1, 2],
      block: 'wood_stairs',
      rotation: 270,
    });
    applyChangeset(client, second, 'forward');

    expect(client.palette).toEqual(server.palette);
    expect(renderAsciiSlice(client, 1, region)).toBe(
      renderAsciiSlice(server, 1, region),
    );
  });

  it('палитра клиента, пропустившего операцию, вызывает ошибку, а не порчу клеток', () => {
    const server = emptyMap();
    applyOp(server, { op: 'setBlock', at: [0, 0, 0], block: 'stone' });
    const missed = applyOp(server, {
      op: 'setBlock',
      at: [1, 0, 0],
      block: 'dirt',
    });
    const client = emptyMap();

    expect(() => applyChangeset(client, missed, 'forward')).toThrow(MapOpError);
  });

  it('undo не затирает клетки, которые позже изменил кто-то другой', () => {
    const map = emptyMap();
    const wall = applyOp(map, {
      op: 'fillBox',
      from: [0, 0, 0],
      to: [3, 0, 0],
      block: 'stone',
    });
    // Пока мастер не откатил стену, нейросеть заменила в ней один блок на дерево.
    applyOp(map, { op: 'setBlock', at: [1, 0, 0], block: 'wood' });

    const { conflicts } = applyChangeset(map, wall, 'backward');

    expect(conflicts).toEqual([[1, 0, 0]]);
    expect(
      renderAsciiSlice(map, 0, { minX: 0, maxX: 3, minZ: 0, maxZ: 0 }),
    ).toContain('0 .A..');
  });
});
