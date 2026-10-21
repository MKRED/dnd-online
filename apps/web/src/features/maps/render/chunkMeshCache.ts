import {
  chunkKey,
  parseChunkKey,
  sameSize,
  type CellMask,
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
  // Биты «видно сейчас» чанка, по которым он покрашен (туман войны).
  seen: Uint8Array | undefined;
  meshes: ChunkMeshes;
}

export interface ChunkMeshCache {
  cutY: number;
  size: MapSize | undefined;
  // Есть ли туман: включился или пропал — перекрасить всё.
  fogged: boolean;
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
// Туман (visible — маска «видно сейчас») перекрашивает только чанки, у которых
// сменились биты: сервер присылает изменившиеся чанки маски, остальные — те же массивы.
export function updateChunkMeshes(
  prev: ChunkMeshCache | null,
  map: MapState & { size?: MapSize },
  cutY: number,
  visible: CellMask | null = null,
): ChunkMeshCache {
  const fogged = visible !== null;
  const { size } = map;
  const sameMapSize =
    prev &&
    (prev.size && size ? sameSize(prev.size, size) : prev.size === size);
  const reuse =
    prev?.cutY === cutY && sameMapSize && prev.fogged === fogged
      ? prev.chunks
      : null;
  const lookup = createBlockLookup(map.palette);
  const chunks = new Map<string, CachedChunk>();
  for (const key of map.store.keys()) {
    const inputs = meshInputs(map.store, key);
    const seen = visible?.get(key);
    const cached = reuse?.get(key);
    const unchanged =
      cached &&
      cached.seen === seen &&
      cached.inputs.every((chunk, i) => chunk === inputs[i]);
    chunks.set(
      key,
      unchanged
        ? cached
        : {
            inputs,
            seen,
            meshes: buildChunkMesh(map.store, key, lookup, {
              cutY,
              size,
              ...(fogged && { seen: seen ?? null }),
            }),
          },
    );
  }
  return { cutY, size, fogged, chunks };
}
