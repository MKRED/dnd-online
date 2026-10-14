import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { desc, eq, type SQL } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { Item, ItemListScope } from 'shared';
import { DatabaseService } from '../database/database.service.js';
import { itemImages, items, users } from '../database/schema/index.js';
import { ItemDto } from './dto/item.dto.js';
import {
  ITEM_NOT_FOUND,
  authoredItem,
  rejectEdit,
  visibleItem,
} from './item-access.js';
import { toItem, toItemValues } from './items.mapper.js';

@Injectable()
export class ItemsService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(ItemsService.name)
    private readonly logger: PinoLogger,
  ) {}

  async create(userId: string, dto: ItemDto): Promise<Item> {
    const t0 = Date.now();
    try {
      const [row] = await this.databaseService.db
        .insert(items)
        .values({ authorId: userId, ...toItemValues(dto) })
        .returning();
      this.logger.info(
        { durationMs: Date.now() - t0, userId, itemId: row.id },
        'Item created',
      );
      return this.findOne(userId, row.id);
    } catch (err: unknown) {
      this.logger.error(
        { err, durationMs: Date.now() - t0, userId },
        'Item creation failed',
      );
      throw err;
    }
  }

  // «Мои» — все свои, и скрытые тоже; «Каталог» — опубликованные всех, свои в том числе.
  async list(userId: string, scope: ItemListScope): Promise<Item[]> {
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
      return rows.map(({ item, authorNickname, image }) =>
        toItem(item, authorNickname, image),
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
      return toItem(row.item, row.authorNickname, row.image);
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, durationMs: Date.now() - t0, userId, itemId: id },
        'Item lookup failed',
      );
      throw err;
    }
  }

  async replace(userId: string, id: string, dto: ItemDto): Promise<Item> {
    const t0 = Date.now();
    const { db } = this.databaseService;
    try {
      const [row] = await db
        .update(items)
        .set(toItemValues(dto))
        .where(authoredItem(userId, id))
        .returning({ id: items.id });
      if (!row) await rejectEdit(db, userId, id);
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
        .leftJoin(itemImages, eq(itemImages.itemId, items.id))
        .where(where)
    );
  }
}
