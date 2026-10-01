import { AIR, cellTypeId } from './cell.js';
import { cellFromChunk, parseChunkKey, type Box3 } from './coords.js';
import type { ChunkStore } from './chunkStore.js';
import { blockNameOf } from './palette.js';
import type { MapState } from './mapState.js';

// Перебирает все непустые клетки карты (воздух пропускается).
function* solidCells(store: ChunkStore) {
  for (const key of store.keys()) {
    const chunk = store.get(key);
    if (!chunk) continue;
    const chunkCoord = parseChunkKey(key);
    for (let index = 0; index < chunk.length; index++) {
      if (chunk[index] !== AIR) {
        yield { cell: cellFromChunk(chunkCoord, index), value: chunk[index] };
      }
    }
  }
}

// Точные границы карты по непустым клеткам; null — карта пустая. Карта растущая,
// поэтому границы не хранятся, а вычисляются.
export function mapBounds(store: ChunkStore): Box3 | null {
  let bounds: { min: number[]; max: number[] } | null = null;
  for (const { cell } of solidCells(store)) {
    if (!bounds) {
      bounds = { min: [...cell], max: [...cell] };
      continue;
    }
    for (let axis = 0; axis < 3; axis++) {
      bounds.min[axis] = Math.min(bounds.min[axis], cell[axis]);
      bounds.max[axis] = Math.max(bounds.max[axis], cell[axis]);
    }
  }
  if (!bounds) return null;
  const [minX, minY, minZ] = bounds.min;
  const [maxX, maxY, maxZ] = bounds.max;
  return { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] };
}

export interface MapSummary {
  bounds: Box3 | null;
  // Число блоков каждого типа; поворот не различается.
  blockCounts: Record<string, number>;
}

export function summarizeMap({ store, palette }: MapState): MapSummary {
  const blockCounts: Record<string, number> = {};
  for (const { value } of solidCells(store)) {
    const name = blockNameOf(palette, cellTypeId(value));
    blockCounts[name] = (blockCounts[name] ?? 0) + 1;
  }
  return { bounds: mapBounds(store), blockCounts };
}
