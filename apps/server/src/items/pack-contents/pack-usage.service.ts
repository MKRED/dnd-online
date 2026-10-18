import { Injectable } from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { ItemPacks } from 'shared';
import {
  DatabaseService,
  type DbTransaction,
} from '../../database/database.service.js';
import { itemPackEntries, items } from '../../database/schema/index.js';

// В каких наборах лежит предмет: для подтверждения удаления и для скрытия своих наборов
// вместе с предметом (docs/plan/done/item-packs.md).
@Injectable()
export class PackUsageService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(PackUsageService.name)
    private readonly logger: PinoLogger,
  ) {}

  // Только для автора предмета. Свои наборы — по названию, чужие — числом: чужой набор
  // может быть скрыт, и его название автору предмета знать незачем.
  async packsOf(userId: string, itemId: string): Promise<ItemPacks> {
    const t0 = Date.now();
    try {
      const rows = await this.databaseService.db
        .select({
          id: items.id,
          name: items.name,
          isPublic: items.isPublic,
          authorId: items.authorId,
        })
        .from(itemPackEntries)
        .innerJoin(items, eq(items.id, itemPackEntries.packId))
        .where(eq(itemPackEntries.itemId, itemId))
        .orderBy(asc(items.name));
      const mine = rows
        .filter((row) => row.authorId === userId)
        .map(({ id, name, isPublic }) => ({ id, name, isPublic }));
      this.logger.debug(
        { durationMs: Date.now() - t0, userId, itemId, packs: rows.length },
        'Item packs looked up',
      );
      return { mine, othersCount: rows.length - mine.length };
    } catch (err: unknown) {
      this.logger.error(
        { err, durationMs: Date.now() - t0, userId, itemId },
        'Item packs lookup failed',
      );
      throw err;
    }
  }

  // Предмет скрывают вместе с его опубликованными наборами автора — одной транзакцией с
  // правкой предмета. Чужие наборы не трогаем: в них строка станет «скрыт автором».
  async hideOwnPacks(
    tx: DbTransaction,
    userId: string,
    itemId: string,
  ): Promise<void> {
    const packIds = tx
      .select({ id: itemPackEntries.packId })
      .from(itemPackEntries)
      .where(eq(itemPackEntries.itemId, itemId));
    const hidden = await tx
      .update(items)
      .set({ isPublic: false })
      .where(
        and(
          inArray(items.id, packIds),
          eq(items.authorId, userId),
          eq(items.isPublic, true),
        ),
      )
      .returning({ id: items.id });
    this.logger.info(
      { userId, itemId, hidden: hidden.length },
      'Own packs hidden with the item',
    );
  }
}
