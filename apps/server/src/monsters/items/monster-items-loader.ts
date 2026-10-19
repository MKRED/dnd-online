import { asc, eq } from 'drizzle-orm';
import type { MonsterItemEntry } from 'shared';
import type { Db } from '../../catalog/catalog-access.js';
import {
  itemImages,
  items,
  monsterItems,
  monsters,
} from '../../database/schema/index.js';
import { toItemLink } from '../../items/item-link.js';

// Снаряжение монстра глазами смотрящего — по общим правилам (toItemLink); владелец —
// автор монстра. Нужно только карточке, поэтому по одному монстру.
export async function loadMonsterItems(
  db: Db,
  viewerId: string,
  monsterId: string,
): Promise<MonsterItemEntry[]> {
  const rows = await db
    .select({
      entry: monsterItems,
      ownerId: monsters.authorId,
      item: items,
      image: itemImages,
    })
    .from(monsterItems)
    .innerJoin(monsters, eq(monsters.id, monsterItems.monsterId))
    .leftJoin(items, eq(items.id, monsterItems.itemId))
    .leftJoin(itemImages, eq(itemImages.ownerId, items.id))
    .where(eq(monsterItems.monsterId, monsterId))
    // id — тай-брейкер на случай одинакового времени.
    .orderBy(asc(monsterItems.addedAt), asc(monsterItems.id));
  return rows.map(({ entry, ownerId, item, image }) => ({
    id: entry.id,
    quantity: entry.quantity,
    ...toItemLink(item, image, viewerId, ownerId),
  }));
}
