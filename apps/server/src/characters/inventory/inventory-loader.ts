import { asc, eq, inArray } from 'drizzle-orm';
import type { InventoryEntry } from 'shared';
import type {
  DatabaseService,
  DbTransaction,
} from '../../database/database.service.js';
import {
  characterItems,
  characters,
  itemImages,
  items,
} from '../../database/schema/index.js';
import { toItemImage } from '../../items/items.mapper.js';

type Db = DatabaseService['db'] | DbTransaction;
type EntryRow = typeof characterItems.$inferSelect;
type ItemRow = typeof items.$inferSelect;
type ItemImageRow = typeof itemImages.$inferSelect;

// Строка инвентаря глазами смотрящего. Предмет видит его автор или любой — у
// опубликованного:
// - скрытому от смотрящего не отдаём ничего из карточки, даже id и вес (решено с
//   пользователем);
// - скрытый от владельца на персонажа не действует. Автор предмета на чужом листе видит
//   свою карточку (свои предметы видны всегда), но строка помечена inactive и в груз не
//   входит — вариант Б, решено с пользователем.
export function toInventoryEntry(
  entry: EntryRow,
  item: ItemRow | null,
  image: ItemImageRow | null,
  viewerId: string,
  ownerId: string,
): InventoryEntry {
  const base = {
    id: entry.id,
    location: entry.location,
    quantity: entry.quantity,
  };
  if (!item) return { ...base, item: null, missing: 'deleted' };
  const sees = (userId: string) => item.authorId === userId || item.isPublic;
  if (!sees(viewerId)) return { ...base, item: null, missing: 'hidden' };
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
    inactive: !sees(ownerId),
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
    .select({
      entry: characterItems,
      ownerId: characters.userId,
      item: items,
      image: itemImages,
    })
    .from(characterItems)
    .innerJoin(characters, eq(characters.id, characterItems.characterId))
    .leftJoin(items, eq(items.id, characterItems.itemId))
    .leftJoin(itemImages, eq(itemImages.itemId, items.id))
    .where(inArray(characterItems.characterId, [...characterIds]))
    // id — тай-брейкер на случай одинакового времени.
    .orderBy(asc(characterItems.addedAt), asc(characterItems.id));
  for (const { entry, ownerId, item, image } of rows) {
    const list = result.get(entry.characterId) ?? [];
    list.push(toInventoryEntry(entry, item, image, viewerId, ownerId));
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
