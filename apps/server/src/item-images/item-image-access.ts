import { NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { ItemImage } from 'shared';
import type { DbTransaction } from '../database/database.service.js';
import { itemImages, items } from '../database/schema/index.js';
import { authoredItem, rejectEdit } from '../items/item-access.js';

export const ITEM_IMAGE_NOT_FOUND = 'У предмета нет картинки';

type ItemImageRow = typeof itemImages.$inferSelect;

export function toItemImage(row: ItemImageRow): ItemImage {
  return {
    version: row.version,
    width: row.width,
    height: row.height,
    thumbCrop: row.thumbCrop,
  };
}

// Строка предмета автора внутри транзакции, с блокировкой до её конца: так две загрузки
// подряд не оставят метаданные одной рядом с байтами другой. Не автор — 403 или 404,
// как у правки самого предмета.
export async function lockAuthoredItem(
  tx: DbTransaction,
  userId: string,
  itemId: string,
): Promise<void> {
  const [row] = await tx
    .select({ id: items.id })
    .from(items)
    .where(authoredItem(userId, itemId))
    .limit(1)
    .for('update');
  if (!row) await rejectEdit(tx, userId, itemId);
}

export async function findItemImage(
  tx: DbTransaction,
  itemId: string,
): Promise<ItemImageRow> {
  const [row] = await tx
    .select()
    .from(itemImages)
    .where(eq(itemImages.itemId, itemId))
    .limit(1);
  if (!row) throw new NotFoundException(ITEM_IMAGE_NOT_FOUND);
  return row;
}
