import { and, count, eq, sql, type SQL } from 'drizzle-orm';
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core';
import {
  chunkKey,
  decodeChunk,
  encodeChunk,
  MemoryChunkStore,
  parseChunkKey,
  type ChunkStore,
} from 'shared';
import type { Db } from '../../catalog/catalog-access.js';
import { mapChunks } from '../../database/schema/index.js';

// Загрузка и сохранение чанков. Операции применяются к MemoryChunkStore в памяти, а
// сюда приходят только чанки, которые операция задевает. Чанки карты и сцены игры
// лежат в таблицах одной формы (game-scenes.ts в схеме), поэтому запросы общие: таблица
// приходит описанием её колонок.
export interface ChunkTable {
  table: PgTable;
  owner: AnyPgColumn;
  // Имя поля владельца в строке для insert: mapId или sceneId.
  ownerKey: string;
  cx: AnyPgColumn;
  cy: AnyPgColumn;
  cz: AnyPgColumn;
  data: AnyPgColumn;
}

export const MAP_CHUNKS: ChunkTable = {
  table: mapChunks,
  owner: mapChunks.mapId,
  ownerKey: 'mapId',
  cx: mapChunks.cx,
  cy: mapChunks.cy,
  cz: mapChunks.cz,
  data: mapChunks.data,
};

interface ChunkRow {
  cx: number;
  cy: number;
  cz: number;
  data: Buffer;
}

function keyCondition(t: ChunkTable, ownerId: string, keys: string[]): SQL {
  // Составной ключ (cx, cy, cz) через row-сравнение: drizzle не умеет IN по кортежам.
  const tuples = keys.map((key) => {
    const [cx, cy, cz] = parseChunkKey(key);
    return sql`(${cx}, ${cy}, ${cz})`;
  });
  return and(
    eq(t.owner, ownerId),
    sql`(${t.cx}, ${t.cy}, ${t.cz}) in (${sql.join(tuples, sql`, `)})`,
  )!;
}

// keys = 'all' — все чанки (рендер, сводка).
export async function loadChunks(
  db: Db,
  t: ChunkTable,
  ownerId: string,
  keys: string[] | 'all',
): Promise<MemoryChunkStore> {
  const store = new MemoryChunkStore();
  if (keys !== 'all' && keys.length === 0) return store;
  const rows = (await db
    .select({ cx: t.cx, cy: t.cy, cz: t.cz, data: t.data })
    .from(t.table)
    .where(
      keys === 'all' ? eq(t.owner, ownerId) : keyCondition(t, ownerId, keys),
    )) as ChunkRow[];
  for (const row of rows) {
    store.set(chunkKey(row.cx, row.cy, row.cz), decodeChunk(row.data));
  }
  return store;
}

export async function countChunks(
  db: Db,
  t: ChunkTable,
  ownerId: string,
): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(t.table)
    .where(eq(t.owner, ownerId));
  return row.value;
}

// Пишет изменённые чанки: оставшиеся в хранилище — upsert, опустевшие — delete.
export async function saveChunks(
  db: Db,
  t: ChunkTable,
  ownerId: string,
  store: ChunkStore,
  dirtyKeys: Iterable<string>,
): Promise<void> {
  const removed: string[] = [];
  const upserts: Record<string, unknown>[] = [];
  for (const key of dirtyKeys) {
    const chunk = store.get(key);
    if (!chunk) {
      removed.push(key);
      continue;
    }
    const [cx, cy, cz] = parseChunkKey(key);
    upserts.push({
      [t.ownerKey]: ownerId,
      cx,
      cy,
      cz,
      data: Buffer.from(encodeChunk(chunk)),
    });
  }
  if (removed.length > 0) {
    await db.delete(t.table).where(keyCondition(t, ownerId, removed));
  }
  if (upserts.length > 0) {
    await db
      .insert(t.table)
      .values(upserts)
      .onConflictDoUpdate({
        target: [t.owner, t.cx, t.cy, t.cz],
        set: { data: sql`excluded.data` },
      });
  }
}
