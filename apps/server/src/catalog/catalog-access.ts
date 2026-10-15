import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { and, eq, or } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import type {
  DatabaseService,
  DbTransaction,
} from '../database/database.service.js';

export type Db = DatabaseService['db'] | DbTransaction;

// Колонки и тексты ошибок, по которым общий код решает, кто видит и кто правит запись
// каталога (предметы, способности, эффекты).
export interface CatalogAccess {
  table: PgTable;
  id: PgColumn;
  authorId: PgColumn;
  isPublic: PgColumn;
  notFound: string;
  authorOnly: string;
}

// Кто видит запись: автор — всегда, остальные — только опубликованную.
// Чужая скрытая запись неотличима от несуществующей.
export function visibleEntry(
  access: CatalogAccess,
  userId: string,
  entryId: string,
) {
  return and(
    eq(access.id, entryId),
    or(eq(access.authorId, userId), eq(access.isPublic, true)),
  );
}

// Менять и удалять может только автор.
export function authoredEntry(
  access: CatalogAccess,
  userId: string,
  entryId: string,
) {
  return and(eq(access.id, entryId), eq(access.authorId, userId));
}

// Правка не нашла запись автора — объясняем почему: чужая опубликованная — 403 (её видно
// в каталоге, «не найдено» сбивало бы с толку), иначе 404.
export async function rejectCatalogEdit(
  db: Db,
  access: CatalogAccess,
  userId: string,
  entryId: string,
): Promise<never> {
  const [visible] = await db
    .select({ id: access.id })
    .from(access.table)
    .where(visibleEntry(access, userId, entryId))
    .limit(1);
  if (visible) throw new ForbiddenException(access.authorOnly);
  throw new NotFoundException(access.notFound);
}

// Строка записи автора внутри транзакции, с блокировкой до её конца: так две правки
// подряд (например, две загрузки картинки) не перемешаются. Не автор — 403 или 404.
export async function lockAuthoredEntry(
  tx: DbTransaction,
  access: CatalogAccess,
  userId: string,
  entryId: string,
): Promise<void> {
  const [row] = await tx
    .select({ id: access.id })
    .from(access.table)
    .where(authoredEntry(access, userId, entryId))
    .limit(1)
    .for('update');
  if (!row) await rejectCatalogEdit(tx, access, userId, entryId);
}
