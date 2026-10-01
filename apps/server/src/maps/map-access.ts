import { NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { DbTransaction } from '../database/database.service.js';
import { maps } from '../database/schema/index.js';

export const MAP_NOT_FOUND = 'Карта не найдена';

// Строка карты владельца внутри транзакции. forUpdate блокирует её до конца транзакции:
// так записи в одну карту (мастер, нейросеть, позже способности) идут строго по очереди
// и не теряют изменения друг друга в чанках. Чужая карта неотличима от несуществующей.
export async function findOwnedMap(
  tx: DbTransaction,
  ownerId: string,
  mapId: string,
  { forUpdate }: { forUpdate: boolean },
) {
  const query = tx
    .select()
    .from(maps)
    .where(and(eq(maps.id, mapId), eq(maps.ownerId, ownerId)))
    .limit(1);
  const [row] = forUpdate ? await query.for('update') : await query;
  if (!row) throw new NotFoundException(MAP_NOT_FOUND);
  return row;
}
