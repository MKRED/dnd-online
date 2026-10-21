import { useState } from 'react';
import type { CellMask, SizedMapState } from 'shared';
import { updateChunkMeshes } from '../render/chunkMeshCache';

// Геометрия чанков, пересобираемая только там, где карта изменилась. Прошлая
// сборка хранится в состоянии и обновляется прямо при рендере, когда сменились
// карта, срез или туман, — так React советует выводить значение из предыдущего.
// visible — маска «видно сейчас» тумана войны игрока; null — тумана нет.
export function useChunkMeshes(
  map: SizedMapState,
  cutY: number,
  visible: CellMask | null = null,
) {
  const [built, setBuilt] = useState(() => ({
    map,
    visible,
    cache: updateChunkMeshes(null, map, cutY, visible),
  }));
  if (
    built.map !== map ||
    built.visible !== visible ||
    built.cache.cutY !== cutY
  ) {
    const next = {
      map,
      visible,
      cache: updateChunkMeshes(built.cache, map, cutY, visible),
    };
    setBuilt(next);
    return next.cache.chunks;
  }
  return built.cache.chunks;
}
