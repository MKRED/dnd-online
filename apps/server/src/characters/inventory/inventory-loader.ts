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
import { toItemLink } from '../../items/item-link.js';

type Db = DatabaseService['db'] | DbTransaction;
type EntryRow = typeof characterItems.$inferSelect;
type ItemRow = typeof items.$inferSelect;
type ItemImageRow = typeof itemImages.$inferSelect;

// Строка инвентаря глазами смотрящего — по общим правилам предмета на существе
// (toItemLink).
export function toInventoryEntry(
  entry: EntryRow,
  item: ItemRow | null,
  image: ItemImageRow | null,
  viewerId: string,
  ownerId: string,
): InventoryEntry {
  return {
    id: entry.id,
    location: entry.location,
    quantity: entry.quantity,
    ...toItemLink(item, image, viewerId, ownerId),
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
    .leftJoin(itemImages, eq(itemImages.ownerId, items.id))
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
