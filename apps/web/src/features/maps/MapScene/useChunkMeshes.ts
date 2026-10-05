import { useState } from 'react';
import type { MapState } from 'shared';
import { updateChunkMeshes } from '../render/chunkMeshCache';

// Геометрия чанков, пересобираемая только там, где карта изменилась. Прошлая
// сборка хранится в состоянии и обновляется прямо при рендере, когда сменились
// карта или срез, — так React советует выводить значение из предыдущего.
export function useChunkMeshes(map: MapState, cutY: number) {
  const [built, setBuilt] = useState(() => ({
    map,
    cache: updateChunkMeshes(null, map, cutY),
  }));
  if (built.map !== map || built.cache.cutY !== cutY) {
    const next = { map, cache: updateChunkMeshes(built.cache, map, cutY) };
    setBuilt(next);
    return next.cache.chunks;
  }
  return built.cache.chunks;
}
