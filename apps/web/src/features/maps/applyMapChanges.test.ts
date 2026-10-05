import {
  applyOps,
  chunkKey,
  createPalette,
  MemoryChunkStore,
  packChangeset,
  readCell,
  type MapState,
} from 'shared';
import { describe, expect, it } from 'vitest';
import { applyMapChanges } from './applyMapChanges';

function emptyMap(): MapState {
  return { store: new MemoryChunkStore(), palette: createPalette() };
}

// Ответ сервера: changeset той же пачки, применённой к его копии карты.
function serverChanges(state: MapState, ops: Parameters<typeof applyOps>[1]) {
  // Полная копия: у сервера своя карта, общие массивы чанков испортили бы нашу.
  const copy: MapState = {
    store: new MemoryChunkStore(),
    palette: [...state.palette],
  };
  for (const key of state.store.keys()) {
    copy.store.set(key, state.store.get(key)!.slice());
  }
  return packChangeset(applyOps(copy, ops));
}

describe('applyMapChanges', () => {
  it('применяет изменения, не трогая старое состояние и нетронутые чанки', () => {
    const before = emptyMap();
    applyOps(before, [
      { op: 'setBlock', at: [0, 0, 0], block: 'stone' },
      { op: 'setBlock', at: [40, 0, 0], block: 'stone' },
    ]);
    const changes = serverChanges(before, [
      { op: 'setBlock', at: [1, 0, 0], block: 'wood' },
    ]);

    const after = applyMapChanges(before, changes);

    expect(readCell(after.store, [1, 0, 0])).not.toBe(0);
    expect(readCell(before.store, [1, 0, 0])).toBe(0);
    expect(after.palette).toEqual(['air', 'stone', 'wood']);
    expect(before.palette).toEqual(['air', 'stone']);
    const far = chunkKey(2, 0, 0);
    expect(after.store.get(far)).toBe(before.store.get(far));
    const near = chunkKey(0, 0, 0);
    expect(after.store.get(near)).not.toBe(before.store.get(near));
  });

  it('бросает, если копия разошлась с сервером', () => {
    const state = emptyMap();
    const changes = serverChanges(state, [
      { op: 'setBlock', at: [0, 0, 0], block: 'stone' },
    ]);
    applyOps(state, [{ op: 'setBlock', at: [0, 0, 0], block: 'stone' }]);

    expect(() => applyMapChanges(state, changes)).toThrow();
  });
});
