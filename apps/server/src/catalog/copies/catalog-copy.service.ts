import {
  BadRequestException,
  ConflictException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { PinoLogger } from 'nestjs-pino';
import { readCatalogOrigin, type CatalogOriginLink } from 'shared';
import {
  authoredEntry,
  rejectCatalogEdit,
  visibleEntry,
  type CatalogAccess,
} from '../catalog-access.js';
import type {
  DatabaseService,
  DbTransaction,
} from '../../database/database.service.js';
import { users, type CatalogEntryTable } from '../../database/schema/index.js';
import { catalogVersion } from './catalog-version.js';

type EntryRow = CatalogEntryTable['$inferSelect'];

// Чем копирование одного каталога отличается от другого: таблица, доступ и тексты
// отказов («Это ваша группа блоков — копировать её не нужно»).
export interface CatalogCopyConfig {
  catalog: string;
  table: CatalogEntryTable;
  access: CatalogAccess;
  ownEntry: string;
  notCopy: string;
}

// Вид и свойства оригинала для копии: всё, кроме ссылки самого оригинала на его
// собственный оригинал (копия копии ссылается на того, у кого скопировали). adapted —
// поля extra, которые каталог подменяет для копии (у обстановки — своя копия модели).
export function contentOf(
  source: EntryRow,
  origin: CatalogOriginLink,
  adapted: Record<string, unknown> = {},
) {
  return {
    category: source.category,
    details: source.details,
    extra: { ...source.extra, ...adapted, origin },
  };
}

export const originOf = (
  source: EntryRow,
  authorNickname: string,
): CatalogOriginLink => ({
  id: source.id,
  name: source.name,
  authorNickname,
  version: catalogVersion(source),
});

// Копирование чужих записей и «Подтянуть обновления» (docs/plan/blocks.md, этап 6б;
// модели — с этапа 8а). Копия — обычная своя запись: её правят как угодно, а обновление
// заменяет её вид и свойства оригинальными. Каталог наследует класс со своим логгером и
// читает готовую запись своим сервисом (read).
export abstract class CatalogCopyService<T> {
  protected constructor(
    private readonly databaseService: DatabaseService,
    private readonly logger: PinoLogger,
    private readonly config: CatalogCopyConfig,
    private readonly read: (userId: string, id: string) => Promise<T>,
  ) {}

  // После обновления копии — например, разослать новый вид блоков на сцены (этап 7).
  protected afterPull?: (userId: string, id: string, entry: T) => Promise<void>;

  // Поля extra копии вместо оригинальных, в той же транзакции: обстановка копирует себе
  // модель оригинала и ссылается на копию (этап 8б). copy — прежняя копия при обновлении,
  // null — при первом копировании.
  protected adaptExtra?: (
    tx: DbTransaction,
    userId: string,
    source: EntryRow,
    copy: EntryRow | null,
  ) => Promise<Record<string, unknown>>;

  // Оригинал, видимый пользователю (свой или опубликованный), с ником автора.
  private async visibleSource(tx: DbTransaction, userId: string, id: string) {
    const { table, access } = this.config;
    const [found] = await tx
      .select({ entry: table, authorNickname: users.nickname })
      .from(table)
      .innerJoin(users, eq(users.id, table.authorId))
      .where(visibleEntry(access, userId, id));
    return found;
  }

  async copy(userId: string, sourceId: string): Promise<T> {
    const { table, access, catalog } = this.config;
    const t0 = Date.now();
    this.logger.info({ catalog, userId, sourceId }, 'Catalog copy started');
    try {
      const id = await this.databaseService.db.transaction(async (tx) => {
        const found = await this.visibleSource(tx, userId, sourceId);
        if (!found) throw new NotFoundException(access.notFound);
        const { entry, authorNickname } = found;
        if (entry.authorId === userId)
          throw new BadRequestException(this.config.ownEntry);
        const [inserted] = await tx
          .insert(table)
          .values({
            authorId: userId,
            name: entry.name,
            description: entry.description,
            sources: entry.sources,
            isPublic: false,
            ...contentOf(
              entry,
              originOf(entry, authorNickname),
              await this.adaptExtra?.(tx, userId, entry, null),
            ),
          })
          .returning({ id: table.id });
        return inserted.id;
      });
      this.logger.info(
        { durationMs: Date.now() - t0, catalog, userId, sourceId, entryId: id },
        'Catalog entry copied',
      );
      return await this.read(userId, id);
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, durationMs: Date.now() - t0, catalog, userId, sourceId },
        'Catalog copy failed',
      );
      throw err;
    }
  }

  async pull(userId: string, id: string): Promise<T> {
    const { table, access, catalog } = this.config;
    const t0 = Date.now();
    this.logger.info({ catalog, userId, entryId: id }, 'Catalog pull started');
    try {
      await this.databaseService.db.transaction(async (tx) => {
        const [copy] = await tx
          .select()
          .from(table)
          .where(authoredEntry(access, userId, id));
        if (!copy) return rejectCatalogEdit(tx, access, userId, id);
        const link = readCatalogOrigin(copy.extra);
        if (!link) throw new BadRequestException(this.config.notCopy);
        const found = await this.visibleSource(tx, userId, link.id);
        if (!found)
          throw new ConflictException(
            'Оригинал недоступен: автор скрыл или удалил его',
          );
        const { entry, authorNickname } = found;
        // Заменяются вид и свойства (решено с пользователем 2026-10-23); название,
        // описание, источники и публикация копии остаются её собственными.
        await tx
          .update(table)
          .set(
            contentOf(
              entry,
              originOf(entry, authorNickname),
              await this.adaptExtra?.(tx, userId, entry, copy),
            ),
          )
          .where(eq(table.id, id));
      });
      this.logger.info(
        { durationMs: Date.now() - t0, catalog, userId, entryId: id },
        'Catalog entry pulled from origin',
      );
      const pulled = await this.read(userId, id);
      await this.afterPull?.(userId, id, pulled);
      return pulled;
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, durationMs: Date.now() - t0, catalog, userId, entryId: id },
        'Catalog pull failed',
      );
      throw err;
    }
  }
}
