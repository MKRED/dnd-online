import { and, count, eq, sql } from 'drizzle-orm';
import {
  decodeChunk,
  encodeChunk,
  MemoryChunkStore,
  parseChunkKey,
  chunkKey,
  type ChunkStore,
} from 'shared';
import type { DbTransaction } from '../database/database.service.js';
import { mapChunks } from '../database/schema/index.js';

// Загрузка и сохранение чанков карты. Операции применяются к MemoryChunkStore в памяти,
// а сюда приходят только чанки, которые операция задевает.

function keyCondition(mapId: string, keys: string[]) {
  // Составной ключ (cx, cy, cz) через row-сравнение: drizzle не умеет IN по кортежам.
  const tuples = keys.map((key) => {
    const [cx, cy, cz] = parseChunkKey(key);
    return sql`(${cx}, ${cy}, ${cz})`;
  });
  return and(
    eq(mapChunks.mapId, mapId),
    sql`(${mapChunks.cx}, ${mapChunks.cy}, ${mapChunks.cz}) in (${sql.join(tuples, sql`, `)})`,
  );
}

// keys = 'all' — вся карта (рендер, сводка).
export async function loadChunks(
  tx: DbTransaction,
  mapId: string,
  keys: string[] | 'all',
): Promise<MemoryChunkStore> {
  const store = new MemoryChunkStore();
  if (keys !== 'all' && keys.length === 0) return store;
  const rows = await tx
    .select()
    .from(mapChunks)
    .where(
      keys === 'all' ? eq(mapChunks.mapId, mapId) : keyCondition(mapId, keys),
    );
  for (const row of rows) {
    store.set(chunkKey(row.cx, row.cy, row.cz), decodeChunk(row.data));
  }
  return store;
}

export async function countChunks(tx: DbTransaction, mapId: string) {
  const [row] = await tx
    .select({ value: count() })
    .from(mapChunks)
    .where(eq(mapChunks.mapId, mapId));
  return row.value;
}

// Пишет изменённые чанки: оставшиеся в хранилище — upsert, опустевшие — delete.
export async function saveChunks(
  tx: DbTransaction,
  mapId: string,
  store: ChunkStore,
  dirtyKeys: Iterable<string>,
): Promise<void> {
  const removed: string[] = [];
  const upserts: (typeof mapChunks.$inferInsert)[] = [];
  for (const key of dirtyKeys) {
    const chunk = store.get(key);
    if (!chunk) {
      removed.push(key);
      continue;
    }
    const [cx, cy, cz] = parseChunkKey(key);
    upserts.push({ mapId, cx, cy, cz, data: Buffer.from(encodeChunk(chunk)) });
  }
  if (removed.length > 0) {
    await tx.delete(mapChunks).where(keyCondition(mapId, removed));
  }
  if (upserts.length > 0) {
    await tx
      .insert(mapChunks)
      .values(upserts)
      .onConflictDoUpdate({
        target: [mapChunks.mapId, mapChunks.cx, mapChunks.cy, mapChunks.cz],
        set: { data: sql`excluded.data` },
      });
  }
}
