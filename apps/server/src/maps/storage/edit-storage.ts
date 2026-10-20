import type {
  ChunkStore,
  MapObjects,
  MemoryChunkStore,
  ObjectChange,
} from 'shared';
import type { Db } from '../../catalog/catalog-access.js';
import {
  countChunks,
  loadChunks,
  MAP_CHUNKS,
  saveChunks,
  type ChunkTable,
} from './chunk-storage.js';
import {
  loadObjects,
  MAP_OBJECTS,
  saveObjects,
  type ObjectTable,
} from './object-storage.js';

// Где лежат чанки и объекты того, что правится: карты в редакторе или сцены игры
// (docs/plan/game.md, этап 6). Операции карты (editMap из shared) не знают, где лежат
// чанки, — правка карты и правка сцены отличаются только этим хранилищем и журналом.
export interface EditStorage {
  loadChunks(db: Db, keys: string[] | 'all'): Promise<MemoryChunkStore>;
  countChunks(db: Db): Promise<number>;
  saveChunks(
    db: Db,
    store: ChunkStore,
    dirtyKeys: Iterable<string>,
  ): Promise<void>;
  loadObjects(db: Db, nextId: number): Promise<MapObjects>;
  saveObjects(db: Db, changes: ObjectChange[]): Promise<void>;
}

export function tableStorage(
  chunks: ChunkTable,
  objects: ObjectTable,
  ownerId: string,
): EditStorage {
  return {
    loadChunks: (db, keys) => loadChunks(db, chunks, ownerId, keys),
    countChunks: (db) => countChunks(db, chunks, ownerId),
    saveChunks: (db, store, dirtyKeys) =>
      saveChunks(db, chunks, ownerId, store, dirtyKeys),
    loadObjects: (db, nextId) => loadObjects(db, objects, ownerId, nextId),
    saveObjects: (db, changes) => saveObjects(db, objects, ownerId, changes),
  };
}

export function mapStorage(mapId: string): EditStorage {
  return tableStorage(MAP_CHUNKS, MAP_OBJECTS, mapId);
}
