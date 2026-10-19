import {
  chunkKey,
  parseChunkKey,
  sameSize,
  type ChunkStore,
  type MapSize,
  type MapState,
} from 'shared';
import { createBlockLookup } from './blockLookup';
import { buildChunkMesh, type ChunkMeshes } from './buildChunkMesh';

interface CachedChunk {
  // Массивы самого чанка и шести соседей, из которых собрана геометрия: соседи
  // решают, видны ли грани на границе чанка.
  inputs: (Uint16Array | undefined)[];
  meshes: ChunkMeshes;
}

export interface ChunkMeshCache {
  cutY: number;
  size: MapSize | undefined;
  chunks: Map<string, CachedChunk>;
}

const NEIGHBOURS = [
  [0, 0, 0],
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
] as const;

function meshInputs(store: ChunkStore, key: string) {
  const [cx, cy, cz] = parseChunkKey(key);
  return NEIGHBOURS.map(([dx, dy, dz]) =>
    store.get(chunkKey(cx + dx, cy + dy, cz + dz)),
  );
}

// Геометрия всех чанков карты с переиспользованием прошлой сборки. Правка меняет
// массивы только затронутых чанков (см. applyMapChanges), поэтому пересобираются
// они и их соседи, а не вся карта. Смена среза или размера пересобирает всё: сужение
// с cut «keep» скрывает блоки, не трогая ни одного массива чанка.
export function updateChunkMeshes(
  prev: ChunkMeshCache | null,
  map: MapState & { size?: MapSize },
  cutY: number,
): ChunkMeshCache {
  const { size } = map;
  const sameMapSize =
    prev &&
    (prev.size && size ? sameSize(prev.size, size) : prev.size === size);
  const reuse = prev?.cutY === cutY && sameMapSize ? prev.chunks : null;
  const lookup = createBlockLookup(map.palette);
  const chunks = new Map<string, CachedChunk>();
  for (const key of map.store.keys()) {
    const inputs = meshInputs(map.store, key);
    const cached = reuse?.get(key);
    const unchanged =
      cached && cached.inputs.every((chunk, i) => chunk === inputs[i]);
    chunks.set(
      key,
      unchanged
        ? cached
        : {
            inputs,
            meshes: buildChunkMesh(map.store, key, lookup, { cutY, size }),
          },
    );
  }
  return { cutY, size, chunks };
}
