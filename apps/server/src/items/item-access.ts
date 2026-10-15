import type { Db } from '../catalog/catalog-access.js';
import {
  authoredEntry,
  rejectCatalogEdit,
  visibleEntry,
  type CatalogAccess,
} from '../catalog/catalog-access.js';
import { items } from '../database/schema/index.js';

export const ITEM_NOT_FOUND = 'Предмет не найден';
export const ITEM_AUTHOR_ONLY = 'Менять предмет может только его автор';

// Доступ к предметам — общий для каталогов (catalog-access.ts).
export const ITEM_ACCESS: CatalogAccess = {
  table: items,
  id: items.id,
  authorId: items.authorId,
  isPublic: items.isPublic,
  notFound: ITEM_NOT_FOUND,
  authorOnly: ITEM_AUTHOR_ONLY,
};

export function visibleItem(userId: string, itemId: string) {
  return visibleEntry(ITEM_ACCESS, userId, itemId);
}

export function authoredItem(userId: string, itemId: string) {
  return authoredEntry(ITEM_ACCESS, userId, itemId);
}

export function rejectEdit(
  db: Db,
  userId: string,
  itemId: string,
): Promise<never> {
  return rejectCatalogEdit(db, ITEM_ACCESS, userId, itemId);
}
