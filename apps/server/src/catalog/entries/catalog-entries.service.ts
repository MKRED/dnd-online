import { HttpException, NotFoundException } from '@nestjs/common';
import { desc, eq, type SQL } from 'drizzle-orm';
import type { PinoLogger } from 'nestjs-pino';
import type { CatalogEntryFields, CatalogListScope } from 'shared';
import type { DatabaseService } from '../../database/database.service.js';
import {
  users,
  type CatalogEntryTable,
  type CatalogImageTables,
} from '../../database/schema/index.js';
import {
  authoredEntry,
  rejectCatalogEdit,
  visibleEntry,
  type CatalogAccess,
} from '../catalog-access.js';
import {
  toCatalogEntry,
  toCatalogEntryValues,
  type ToStored,
  type ToVariant,
} from './catalog-entry.mapper.js';
import type { CatalogEntryDto } from './dto/catalog-entry.dto.js';

// Чем один простой каталог отличается от другого. catalog — имя в логах. D — тело
// запроса каталога.
export interface CatalogEntriesConfig<
  V,
  D extends CatalogEntryDto = CatalogEntryDto,
> {
  catalog: string;
  table: CatalogEntryTable;
  images: CatalogImageTables;
  access: CatalogAccess;
  toVariant: ToVariant<V>;
  toStored: ToStored<D>;
}

// CRUD простого каталога (способности, эффекты): доступ как у предметов, без их веса,
// стоимости и наборов. Каждый каталог наследует класс со своими таблицами и логгером.
export abstract class CatalogEntriesService<
  V,
  D extends CatalogEntryDto = CatalogEntryDto,
> {
  protected constructor(
    private readonly databaseService: DatabaseService,
    private readonly logger: PinoLogger,
    private readonly config: CatalogEntriesConfig<V, D>,
  ) {}

  async create(userId: string, dto: D): Promise<V & CatalogEntryFields> {
    const { table, catalog, toStored } = this.config;
    const t0 = Date.now();
    try {
      const [row] = await this.databaseService.db
        .insert(table)
        .values({ authorId: userId, ...toCatalogEntryValues(dto, toStored) })
        .returning({ id: table.id });
      this.logger.info(
        { durationMs: Date.now() - t0, catalog, userId, entryId: row.id },
        'Catalog entry created',
      );
      return this.findOne(userId, row.id);
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, durationMs: Date.now() - t0, catalog, userId },
        'Catalog entry creation failed',
      );
      throw err;
    }
  }

  // «Мои» — все свои, и скрытые тоже; «Каталог» — опубликованные всех, свои в том числе.
  async list(
    userId: string,
    scope: CatalogListScope,
  ): Promise<(V & CatalogEntryFields)[]> {
    const { table, catalog } = this.config;
    const t0 = Date.now();
    const where =
      scope === 'mine' ? eq(table.authorId, userId) : eq(table.isPublic, true);
    try {
      const rows = await this.selectWithAuthor(where).orderBy(
        // createdAt — тай-брейкер, чтобы порядок не прыгал между запросами.
        desc(table.updatedAt),
        desc(table.createdAt),
      );
      this.logger.debug(
        {
          durationMs: Date.now() - t0,
          catalog,
          userId,
          scope,
          count: rows.length,
        },
        'Catalog entries listed',
      );
      return rows.map(({ entry, authorNickname, image }) =>
        toCatalogEntry(entry, authorNickname, image, this.config.toVariant),
      );
    } catch (err: unknown) {
      this.logger.error(
        { err, durationMs: Date.now() - t0, catalog, userId, scope },
        'Catalog entry listing failed',
      );
      throw err;
    }
  }

  async findOne(userId: string, id: string): Promise<V & CatalogEntryFields> {
    const { access, catalog } = this.config;
    const t0 = Date.now();
    try {
      const [row] = await this.selectWithAuthor(
        visibleEntry(access, userId, id),
      ).limit(1);
      this.logger.debug(
        {
          durationMs: Date.now() - t0,
          catalog,
          userId,
          entryId: id,
          found: !!row,
        },
        'Catalog entry lookup',
      );
      if (!row) throw new NotFoundException(access.notFound);
      return toCatalogEntry(
        row.entry,
        row.authorNickname,
        row.image,
        this.config.toVariant,
      );
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, durationMs: Date.now() - t0, catalog, userId, entryId: id },
        'Catalog entry lookup failed',
      );
      throw err;
    }
  }

  async replace(
    userId: string,
    id: string,
    dto: D,
  ): Promise<V & CatalogEntryFields> {
    const { table, access, catalog, toStored } = this.config;
    const t0 = Date.now();
    const { db } = this.databaseService;
    try {
      const [row] = await db
        .update(table)
        .set(toCatalogEntryValues(dto, toStored))
        .where(authoredEntry(access, userId, id))
        .returning({ id: table.id });
      if (!row) await rejectCatalogEdit(db, access, userId, id);
      this.logger.info(
        { durationMs: Date.now() - t0, catalog, userId, entryId: id },
        'Catalog entry updated',
      );
      return this.findOne(userId, id);
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, durationMs: Date.now() - t0, catalog, userId, entryId: id },
        'Catalog entry update failed',
      );
      throw err;
    }
  }

  async remove(userId: string, id: string): Promise<void> {
    const { table, access, catalog } = this.config;
    const t0 = Date.now();
    const { db } = this.databaseService;
    try {
      // Картинка уходит каскадом.
      const [row] = await db
        .delete(table)
        .where(authoredEntry(access, userId, id))
        .returning({ id: table.id });
      if (!row) await rejectCatalogEdit(db, access, userId, id);
      this.logger.info(
        { durationMs: Date.now() - t0, catalog, userId, entryId: id },
        'Catalog entry deleted',
      );
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, durationMs: Date.now() - t0, catalog, userId, entryId: id },
        'Catalog entry deletion failed',
      );
      throw err;
    }
  }

  // Ник автора и метаданные картинки нужны и в каталоге, и в карточке, поэтому запись
  // всегда читаем с ними.
  private selectWithAuthor(where: SQL | undefined) {
    const { table, images } = this.config;
    return this.databaseService.db
      .select({
        entry: table,
        authorNickname: users.nickname,
        image: images.images,
      })
      .from(table)
      .innerJoin(users, eq(users.id, table.authorId))
      .leftJoin(images.images, eq(images.images.ownerId, table.id))
      .where(where);
  }
}
