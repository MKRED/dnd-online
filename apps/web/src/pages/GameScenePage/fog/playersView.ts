import {
  maskChunk,
  MemoryChunkStore,
  objectSeen,
  type FogMasks,
  type MapObject,
} from 'shared';
import type { MapViewState } from '../../../features/maps/mapStateFromChunks';

// Сцена глазами игроков для мастера (docs/plan/done/fog-of-war.md, этап 6): то же правило,
// что сервер применяет к копии игрока (scene-player-view.ts), но на клиенте — у мастера
// вся сцена уже есть. Блоки — только в открытом, объекты — не скрытые и видные группе.
// Это просмотр, а не защита: мастеру можно видеть всё.

// Вырезанный чанк по исходному массиву и битам «открыто»: пока ни то, ни другое не
// сменилось, чанк остаётся тем же массивом, и сцена его не пересобирает.
const masked = new WeakMap<
  Uint16Array,
  { bits: Uint8Array | undefined; chunk: Uint16Array | null }
>();

function maskedChunk(chunk: Uint16Array, bits: Uint8Array | undefined) {
  const cached = masked.get(chunk);
  if (cached && cached.bits === bits) return cached.chunk;
  const next = maskChunk(chunk, bits);
  masked.set(chunk, { bits, chunk: next });
  return next;
}

export function playersView(state: MapViewState, fog: FogMasks): MapViewState {
  const store = new MemoryChunkStore();
  for (const key of state.store.keys()) {
    const chunk = maskedChunk(state.store.get(key)!, fog.explored.get(key));
    if (chunk) store.set(key, chunk);
  }
  const byId = new Map<number, MapObject>();
  for (const [id, object] of state.objects.byId) {
    if (!object.hidden && objectSeen(object, fog)) byId.set(id, object);
  }
  return {
    ...state,
    store,
    objects: { byId, nextId: state.objects.nextId },
  };
}
