import { AIR } from './cell.js';
import { CHUNK_VOLUME, cellLocation, type Vec3 } from './coords.js';

// Хранилище чанков по ключу «cx,cy,cz». Операции работают только через этот интерфейс,
// поэтому один код применяется и к шаблону карты, и к слою изменений сцены,
// а сервер подкладывает чанки, заранее загруженные из БД.
export interface ChunkStore {
  get(key: string): Uint16Array | undefined;
  set(key: string, chunk: Uint16Array): void;
  delete(key: string): void;
  keys(): Iterable<string>;
}

export class MemoryChunkStore implements ChunkStore {
  private readonly chunks = new Map<string, Uint16Array>();

  get(key: string) {
    return this.chunks.get(key);
  }

  set(key: string, chunk: Uint16Array) {
    this.chunks.set(key, chunk);
  }

  delete(key: string) {
    this.chunks.delete(key);
  }

  keys() {
    return this.chunks.keys();
  }
}

export function readCell(store: ChunkStore, cell: Vec3): number {
  const { key, index } = cellLocation(cell);
  return store.get(key)?.[index] ?? AIR;
}

// Отсутствующий чанк — это воздух, поэтому запись воздуха новый чанк не создаёт.
export function writeCell(store: ChunkStore, cell: Vec3, value: number): void {
  const { key, index } = cellLocation(cell);
  let chunk = store.get(key);
  if (!chunk) {
    if (value === AIR) return;
    chunk = new Uint16Array(CHUNK_VOLUME);
    store.set(key, chunk);
  }
  chunk[index] = value;
}

// Пустые чанки не храним — иначе границы карты и число чанков (лимит) росли бы от удалений.
export function pruneEmptyChunks(store: ChunkStore, keys: Iterable<string>) {
  for (const key of keys) {
    const chunk = store.get(key);
    if (chunk && chunk.every((cell) => cell === AIR)) store.delete(key);
  }
}
