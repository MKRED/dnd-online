import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { desc, eq, type SQL } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { Item, CatalogListScope } from 'shared';
import {
  keepPublicationForToken,
  type CatalogWriteOptions,
} from '../catalog/token-publication.js';
import { DatabaseService } from '../database/database.service.js';
import { itemImages, items, users } from '../database/schema/index.js';
import { ItemDto } from './dto/item.dto.js';
import { ItemHoldersService } from './item-holders.service.js';
import {
  ITEM_ACCESS,
  ITEM_NOT_FOUND,
  authoredItem,
  rejectEdit,
  visibleItem,
} from './item-access.js';
import {
  packContentsOf,
  publicationOf,
  toItem,
  toItemValues,
} from './items.mapper.js';
import {
  PackContentsService,
  PackUsageService,
} from './pack-contents/index.js';

@Injectable()
export class ItemsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly packContents: PackContentsService,
    private readonly packUsage: PackUsageService,
    private readonly holders: ItemHoldersService,
    @InjectPinoLogger(ItemsService.name)
    private readonly logger: PinoLogger,
  ) {}

  async create(
    userId: string,
    dto: ItemDto,
    options: CatalogWriteOptions = {},
  ): Promise<Item> {
    const t0 = Date.now();
    try {
      // Предмет и состав набора пишутся вместе: отказ по составу не оставит пустой набор.
      const row = await this.databaseService.db.transaction(async (tx) => {
        await keepPublicationForToken(
          tx,
          ITEM_ACCESS,
          userId,
          null,
          dto,
          options,
        );
        const [inserted] = await tx
          .insert(items)
          .values({ authorId: userId, ...toItemValues(dto) })
          .returning({ id: items.id });
        const contents = packContentsOf(dto);
        if (contents) {
          await this.packContents.replace(
            tx,
            userId,
            inserted.id,
            contents,
            publicationOf(dto),
          );
        }
        return inserted;
      });
      this.logger.info(
        { durationMs: Date.now() - t0, userId, itemId: row.id },
        'Item created',
      );
      return this.findOne(userId, row.id);
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, durationMs: Date.now() - t0, userId },
        'Item creation failed',
      );
      throw err;
    }
  }

  // «Мои» — все свои, и скрытые тоже; «Каталог» — опубликованные всех, свои в том числе.
  async list(userId: string, scope: CatalogListScope): Promise<Item[]> {
    const t0 = Date.now();
    const where =
      scope === 'mine' ? eq(items.authorId, userId) : eq(items.isPublic, true);
    try {
      const rows = await this.selectWithAuthor(where).orderBy(
        // createdAt — тай-брейкер, чтобы порядок не прыгал между запросами.
        desc(items.updatedAt),
        desc(items.createdAt),
      );
      this.logger.debug(
        { durationMs: Date.now() - t0, userId, scope, count: rows.length },
        'Items listed',
      );
      const contents = await this.packContents.resolve(
        userId,
        rows
          .filter(({ item }) => item.category === 'pack')
          .map(({ item }) => item.id),
      );
      return rows.map(({ item, authorNickname, image }) =>
        toItem(item, authorNickname, image, contents.get(item.id)),
      );
    } catch (err: unknown) {
      this.logger.error(
        { err, durationMs: Date.now() - t0, userId, scope },
        'Item listing failed',
      );
      throw err;
    }
  }

  async findOne(userId: string, id: string): Promise<Item> {
    const t0 = Date.now();
    try {
      const [row] = await this.selectWithAuthor(visibleItem(userId, id)).limit(
        1,
      );
      this.logger.debug(
        { durationMs: Date.now() - t0, userId, itemId: id, found: !!row },
        'Item lookup',
      );
      if (!row) throw new NotFoundException(ITEM_NOT_FOUND);
      const contents =
        row.item.category === 'pack'
          ? await this.packContents.resolve(userId, [id])
          : undefined;
      const item = toItem(
        row.item,
        row.authorNickname,
        row.image,
        contents?.get(id),
      );
      // Где лежит предмет — только автору: остальным знать про чужие наборы и персонажей
      // незачем.
      if (row.item.authorId === userId) {
        item.packs = await this.packUsage.packsOf(userId, id);
        item.holders = await this.holders.holdersOf(userId, id);
      }
      return item;
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, durationMs: Date.now() - t0, userId, itemId: id },
        'Item lookup failed',
      );
      throw err;
    }
  }

  async replace(
    userId: string,
    id: string,
    dto: ItemDto,
    options: CatalogWriteOptions = {},
  ): Promise<Item> {
    const t0 = Date.now();
    const { db } = this.databaseService;
    try {
      await db.transaction(async (tx) => {
        await keepPublicationForToken(
          tx,
          ITEM_ACCESS,
          userId,
          id,
          dto,
          options,
        );
        const [row] = await tx
          .update(items)
          .set(toItemValues(dto))
          .where(authoredItem(userId, id))
          .returning({ id: items.id });
        if (!row) await rejectEdit(tx, userId, id);
        // Состав заменяется целиком; сменил набор категорию — строки уходят.
        await this.packContents.replace(
          tx,
          userId,
          id,
          packContentsOf(dto),
          publicationOf(dto),
        );
        if (!dto.isPublic && dto.hidePacks) {
          await this.packUsage.hideOwnPacks(tx, userId, id);
        }
      });
      this.logger.info(
        { durationMs: Date.now() - t0, userId, itemId: id },
        'Item updated',
      );
      return this.findOne(userId, id);
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, durationMs: Date.now() - t0, userId, itemId: id },
        'Item update failed',
      );
      throw err;
    }
  }

  async remove(userId: string, id: string): Promise<void> {
    const t0 = Date.now();
    const { db } = this.databaseService;
    try {
      const [row] = await db
        .delete(items)
        .where(authoredItem(userId, id))
        .returning({ id: items.id });
      if (!row) await rejectEdit(db, userId, id);
      this.logger.info(
        { durationMs: Date.now() - t0, userId, itemId: id },
        'Item deleted',
      );
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, durationMs: Date.now() - t0, userId, itemId: id },
        'Item deletion failed',
      );
      throw err;
    }
  }

  // Ник автора и картинка нужны и в каталоге, и в карточке, поэтому предмет всегда читаем с ними.
  private selectWithAuthor(where: SQL | undefined) {
    return (
      this.databaseService.db
        .select({
          item: items,
          authorNickname: users.nickname,
          image: itemImages,
        })
        .from(items)
        .innerJoin(users, eq(users.id, items.authorId))
        // Метаданные картинки (без байтов): карточке нужно знать, есть ли миниатюра и её версию.
        .leftJoin(itemImages, eq(itemImages.ownerId, items.id))
        .where(where)
    );
  }
}
