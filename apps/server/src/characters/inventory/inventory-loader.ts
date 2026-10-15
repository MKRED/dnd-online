import { asc, eq, inArray } from 'drizzle-orm';
import type { InventoryEntry } from 'shared';
import type {
  DatabaseService,
  DbTransaction,
} from '../../database/database.service.js';
import {
  characterItems,
  itemImages,
  items,
} from '../../database/schema/index.js';
import { toItemImage } from '../../items/items.mapper.js';

type Db = DatabaseService['db'] | DbTransaction;
type EntryRow = typeof characterItems.$inferSelect;
type ItemRow = typeof items.$inferSelect;
type ItemImageRow = typeof itemImages.$inferSelect;

// Строка инвентаря глазами смотрящего: карточку видит тот, кто видит сам предмет (автор
// или любой — у опубликованного), как в составе наборов. Скрытому от смотрящего не
// отдаём ничего из карточки, даже id и вес (решено с пользователем).
export function toInventoryEntry(
  entry: EntryRow,
  item: ItemRow | null,
  image: ItemImageRow | null,
  viewerId: string,
): InventoryEntry {
  const base = {
    id: entry.id,
    location: entry.location,
    quantity: entry.quantity,
  };
  if (!item) return { ...base, item: null, missing: 'deleted' };
  if (item.authorId !== viewerId && !item.isPublic) {
    return { ...base, item: null, missing: 'hidden' };
  }
  return {
    ...base,
    item: {
      id: item.id,
      name: item.name,
      category: item.category,
      rarity: item.rarity,
      weight: item.weight,
      isPublic: item.isPublic,
      image: toItemImage(image),
    },
    missing: null,
  };
}

// Инвентари нескольких персонажей одним запросом — для списка и листа.
export async function loadInventories(
  db: Db,
  viewerId: string,
  characterIds: readonly string[],
): Promise<Map<string, InventoryEntry[]>> {
  const result = new Map<string, InventoryEntry[]>();
  if (characterIds.length === 0) return result;
  const rows = await db
    .select({ entry: characterItems, item: items, image: itemImages })
    .from(characterItems)
    .leftJoin(items, eq(items.id, characterItems.itemId))
    .leftJoin(itemImages, eq(itemImages.itemId, items.id))
    .where(inArray(characterItems.characterId, [...characterIds]))
    // id — тай-брейкер для строк, добавленных в одну транзакцию (распаковка набора).
    .orderBy(asc(characterItems.addedAt), asc(characterItems.id));
  for (const { entry, item, image } of rows) {
    const list = result.get(entry.characterId) ?? [];
    list.push(toInventoryEntry(entry, item, image, viewerId));
    result.set(entry.characterId, list);
  }
  return result;
}

export async function loadInventory(
  db: Db,
  viewerId: string,
  characterId: string,
): Promise<InventoryEntry[]> {
  const inventories = await loadInventories(db, viewerId, [characterId]);
  return inventories.get(characterId) ?? [];
}
