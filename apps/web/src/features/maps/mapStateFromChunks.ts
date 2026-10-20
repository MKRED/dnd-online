import {
  chunkKey,
  createMapObjects,
  decodeChunk,
  MemoryChunkStore,
  type MapChunksResponse,
  type MapObjects,
  type SizedMapState,
} from 'shared';

// Карта страницы: блоки с размером и объекты (docs/plan/map-objects.md). Объекты
// нужны копии всегда: changeset правки, тронувшей их, без них не применится.
export type MapViewState = SizedMapState & { objects: MapObjects };

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Ответ /maps/:id/chunks → карта с размером и объектами, с которой работают общие функции из shared.
export function mapStateFromChunks(response: MapChunksResponse): MapViewState {
  const store = new MemoryChunkStore();
  for (const { cx, cy, cz, data } of response.chunks) {
    store.set(chunkKey(cx, cy, cz), decodeChunk(base64ToBytes(data)));
  }
  return {
    store,
    palette: [...response.palette],
    size: { ...response.size },
    objects: createMapObjects(response.objects, response.nextObjectId),
  };
}
