import { and, asc, eq, inArray } from 'drizzle-orm';
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core';
import {
  createMapObjects,
  type MapObject,
  type MapObjectKind,
  type MapObjects,
  type ObjectChange,
} from 'shared';
import type { Db } from '../../catalog/catalog-access.js';
import { mapObjects } from '../../database/schema/index.js';

// Объекты карты или сцены игры: таблицы одной формы, как у чанков (chunk-storage.ts).
export interface ObjectTable {
  table: PgTable;
  owner: AnyPgColumn;
  // Имя поля владельца в строке для insert: mapId или sceneId.
  ownerKey: string;
  id: AnyPgColumn;
  kind: AnyPgColumn;
  x: AnyPgColumn;
  y: AnyPgColumn;
  z: AnyPgColumn;
  hidden: AnyPgColumn;
  fields: AnyPgColumn;
}

export const MAP_OBJECTS: ObjectTable = {
  table: mapObjects,
  owner: mapObjects.mapId,
  ownerKey: 'mapId',
  id: mapObjects.id,
  kind: mapObjects.kind,
  x: mapObjects.x,
  y: mapObjects.y,
  z: mapObjects.z,
  hidden: mapObjects.hidden,
  fields: mapObjects.fields,
};

// Строка объекта без владельца: клетка — колонками, поля вида — в jsonb fields.
export interface ObjectRow {
  id: number;
  kind: MapObjectKind;
  x: number;
  y: number;
  z: number;
  hidden: boolean;
  fields: Record<string, unknown>;
}

export function toMapObject(row: ObjectRow): MapObject {
  return {
    ...row.fields,
    id: row.id,
    kind: row.kind,
    at: [row.x, row.y, row.z],
    hidden: row.hidden,
  } as unknown as MapObject;
}

function toRow(object: MapObject): ObjectRow {
  const { id, kind, at, hidden, ...fields } = object;
  return { id, kind, x: at[0], y: at[1], z: at[2], hidden, fields };
}

export async function loadObjects(
  db: Db,
  t: ObjectTable,
  ownerId: string,
  nextId: number,
): Promise<MapObjects> {
  const rows = (await db
    .select({
      id: t.id,
      kind: t.kind,
      x: t.x,
      y: t.y,
      z: t.z,
      hidden: t.hidden,
      fields: t.fields,
    })
    .from(t.table)
    .where(eq(t.owner, ownerId))
    .orderBy(asc(t.id))) as ObjectRow[];
  return createMapObjects(rows.map(toMapObject), nextId);
}

// Пишет объекты, которые правка реально изменила: убранные — delete, остальные — upsert.
export async function saveObjects(
  db: Db,
  t: ObjectTable,
  ownerId: string,
  changes: ObjectChange[],
): Promise<void> {
  const removed = changes.filter((c) => !c.after).map((c) => c.id);
  if (removed.length > 0) {
    await db
      .delete(t.table)
      .where(and(eq(t.owner, ownerId), inArray(t.id, removed)));
  }
  for (const change of changes) {
    if (!change.after) continue;
    const row = toRow(change.after);
    await db
      .insert(t.table)
      .values({ ...row, [t.ownerKey]: ownerId })
      .onConflictDoUpdate({
        target: [t.owner, t.id],
        set: {
          kind: row.kind,
          x: row.x,
          y: row.y,
          z: row.z,
          hidden: row.hidden,
          fields: row.fields,
        },
      });
  }
}
