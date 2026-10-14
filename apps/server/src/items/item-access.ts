import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { and, eq, or } from 'drizzle-orm';
import type {
  DatabaseService,
  DbTransaction,
} from '../database/database.service.js';
import { items } from '../database/schema/index.js';

type Db = DatabaseService['db'] | DbTransaction;

export const ITEM_NOT_FOUND = 'Предмет не найден';
export const ITEM_AUTHOR_ONLY = 'Менять предмет может только его автор';

// Кто видит предмет: автор — всегда, остальные — только опубликованный.
// Чужой скрытый предмет неотличим от несуществующего.
export function visibleItem(userId: string, itemId: string) {
  return and(
    eq(items.id, itemId),
    or(eq(items.authorId, userId), eq(items.isPublic, true)),
  );
}

// Менять и удалять может только автор.
export function authoredItem(userId: string, itemId: string) {
  return and(eq(items.id, itemId), eq(items.authorId, userId));
}

// Правка не нашла предмет автора — объясняем почему: чужой опубликованный — 403
// (его видно в каталоге, «не найден» сбивал бы с толку), иначе 404.
export async function rejectEdit(
  db: Db,
  userId: string,
  itemId: string,
): Promise<never> {
  const [visible] = await db
    .select({ id: items.id })
    .from(items)
    .where(visibleItem(userId, itemId))
    .limit(1);
  if (visible) throw new ForbiddenException(ITEM_AUTHOR_ONLY);
  throw new NotFoundException(ITEM_NOT_FOUND);
}
