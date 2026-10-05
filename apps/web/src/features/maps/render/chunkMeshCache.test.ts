import {
  applyOps,
  chunkKey,
  createPalette,
  MemoryChunkStore,
  packChangeset,
  type MapOp,
  type MapState,
} from 'shared';
import { describe, expect, it } from 'vitest';
import { applyMapChanges } from '../applyMapChanges';
import { updateChunkMeshes } from './chunkMeshCache';

// Три чанка в ряд по x: 0, 1 и 3 (между 1 и 3 — пустой чанк 2).
function threeChunks(): MapState {
  const map: MapState = {
    store: new MemoryChunkStore(),
    palette: createPalette(),
  };
  applyOps(map, [
    { op: 'setBlock', at: [0, 0, 0], block: 'stone' },
    { op: 'setBlock', at: [16, 0, 0], block: 'stone' },
    { op: 'setBlock', at: [48, 0, 0], block: 'stone' },
  ]);
  return map;
}

function edit(map: MapState, ops: MapOp[]) {
  // Сервер применяет пачку к своей, полностью отдельной копии карты.
  const server: MapState = {
    store: new MemoryChunkStore(),
    palette: [...map.palette],
  };
  for (const key of map.store.keys()) {
    server.store.set(key, map.store.get(key)!.slice());
  }
  return applyMapChanges(map, packChangeset(applyOps(server, ops)));
}

const meshesOf = (cache: ReturnType<typeof updateChunkMeshes>, cx: number) =>
  cache.chunks.get(chunkKey(cx, 0, 0))?.meshes;

describe('updateChunkMeshes', () => {
  it('пересобирает изменённый чанк и его соседей, остальные берёт из кэша', () => {
    const before = threeChunks();
    const first = updateChunkMeshes(null, before, 100);

    const after = edit(before, [
      { op: 'setBlock', at: [1, 0, 0], block: 'stone' },
    ]);
    const second = updateChunkMeshes(first, after, 100);

    expect(meshesOf(second, 0)).not.toBe(meshesOf(first, 0));
    expect(meshesOf(second, 1)).not.toBe(meshesOf(first, 1));
    expect(meshesOf(second, 3)).toBe(meshesOf(first, 3));
  });

  it('при смене среза пересобирает всё', () => {
    const map = threeChunks();
    const first = updateChunkMeshes(null, map, 100);
    const second = updateChunkMeshes(first, map, 0);

    expect(meshesOf(second, 3)).not.toBe(meshesOf(first, 3));
  });
});
