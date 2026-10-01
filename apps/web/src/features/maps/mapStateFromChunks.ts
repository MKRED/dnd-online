import {
  chunkKey,
  decodeChunk,
  MemoryChunkStore,
  type MapChunksResponse,
  type MapState,
} from 'shared';

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Ответ /maps/:id/chunks → MapState, с которым работают общие функции из shared.
export function mapStateFromChunks(response: MapChunksResponse): MapState {
  const store = new MemoryChunkStore();
  for (const { cx, cy, cz, data } of response.chunks) {
    store.set(chunkKey(cx, cy, cz), decodeChunk(base64ToBytes(data)));
  }
  return { store, palette: [...response.palette] };
}
