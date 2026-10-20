import { and, eq, inArray } from 'drizzle-orm';
import {
  createMapObjects,
  type MapObject,
  type MapObjects,
  type ObjectChange,
} from 'shared';
import type { DbTransaction } from '../../database/database.service.js';
import { mapObjects } from '../../database/schema/index.js';

type MapObjectRow = typeof mapObjects.$inferSelect;

// Строка ↔ объект: клетка — колонками, поля вида — в jsonb fields.
export function toMapObject(row: MapObjectRow): MapObject {
  return {
    ...row.fields,
    id: row.id,
    kind: row.kind,
    at: [row.x, row.y, row.z],
    hidden: row.hidden,
  } as unknown as MapObject;
}

function toRow(mapId: string, object: MapObject): MapObjectRow {
  const { id, kind, at, hidden, ...fields } = object;
  return { mapId, id, kind, x: at[0], y: at[1], z: at[2], hidden, fields };
}

export async function loadObjects(
  tx: DbTransaction,
  mapId: string,
  nextId: number,
): Promise<MapObjects> {
  const rows = await tx
    .select()
    .from(mapObjects)
    .where(eq(mapObjects.mapId, mapId))
    .orderBy(mapObjects.id);
  return createMapObjects(rows.map(toMapObject), nextId);
}

// Пишет объекты, которые правка реально изменила: убранные — delete, остальные — upsert.
export async function saveObjects(
  tx: DbTransaction,
  mapId: string,
  changes: ObjectChange[],
): Promise<void> {
  const removed = changes.filter((c) => !c.after).map((c) => c.id);
  const upserts = changes.flatMap((c) =>
    c.after ? [toRow(mapId, c.after)] : [],
  );
  if (removed.length > 0) {
    await tx
      .delete(mapObjects)
      .where(and(eq(mapObjects.mapId, mapId), inArray(mapObjects.id, removed)));
  }
  for (const row of upserts) {
    await tx
      .insert(mapObjects)
      .values(row)
      .onConflictDoUpdate({
        target: [mapObjects.mapId, mapObjects.id],
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
