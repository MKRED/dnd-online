import { BadRequestException, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, or } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { PackEntry, PackEntryInput } from 'shared';
import {
  DatabaseService,
  type DbTransaction,
} from '../../database/database.service.js';
import {
  itemImages,
  itemPackEntries,
  items,
} from '../../database/schema/index.js';
import { toItemImage } from '../items.mapper.js';
import { PACK_ITEM_IN_PACK, packContentsError } from './pack-contents.rules.js';

// Состав наборов снаряжения (docs/plan/item-packs.md): запись строк вместе с предметом,
// проверка ссылок и сборка состава для читателя.
@Injectable()
export class PackContentsService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(PackContentsService.name)
    private readonly logger: PinoLogger,
  ) {}

  // Заменяет состав набора целиком внутри транзакции записи предмета. contents = null —
  // предмет не набор (или перестал им быть): строк у него не остаётся.
  async replace(
    tx: DbTransaction,
    userId: string,
    packId: string,
    contents: readonly PackEntryInput[] | null,
  ): Promise<void> {
    const t0 = Date.now();
    await tx.delete(itemPackEntries).where(eq(itemPackEntries.packId, packId));
    if (!contents) return;

    // Предмет, который сам лежит в наборах, набором стать не может — иначе набор в наборе.
    const [contained] = await tx
      .select({ packId: itemPackEntries.packId })
      .from(itemPackEntries)
      .where(eq(itemPackEntries.itemId, packId))
      .limit(1);
    if (contained) throw new BadRequestException(PACK_ITEM_IN_PACK);

    const ids = contents.map((entry) => entry.itemId);
    const found = await tx
      .select({ id: items.id, category: items.category })
      .from(items)
      .where(
        and(
          inArray(items.id, ids),
          or(eq(items.authorId, userId), eq(items.isPublic, true)),
        ),
      );
    const error = packContentsError(ids, found);
    if (error) {
      this.logger.info(
        { userId, packId, requested: ids.length, found: found.length, error },
        'Pack contents rejected',
      );
      throw new BadRequestException(error);
    }

    await tx.insert(itemPackEntries).values(
      contents.map((entry, position) => ({
        packId,
        itemId: entry.itemId,
        quantity: entry.quantity,
        position,
      })),
    );
    this.logger.debug(
      { durationMs: Date.now() - t0, userId, packId, entries: contents.length },
      'Pack contents replaced',
    );
  }

  // Состав нескольких наборов одним запросом — для списка и карточки. Карточку предмета
  // строки получает только тот, кто этот предмет видит; остальным — item: null.
  async resolve(
    userId: string,
    packIds: readonly string[],
  ): Promise<Map<string, PackEntry[]>> {
    const result = new Map<string, PackEntry[]>();
    if (packIds.length === 0) return result;
    const t0 = Date.now();
    try {
      const rows = await this.databaseService.db
        .select({ entry: itemPackEntries, item: items, image: itemImages })
        .from(itemPackEntries)
        .innerJoin(items, eq(items.id, itemPackEntries.itemId))
        .leftJoin(itemImages, eq(itemImages.itemId, items.id))
        .where(inArray(itemPackEntries.packId, [...packIds]))
        .orderBy(asc(itemPackEntries.position));
      for (const { entry, item, image } of rows) {
        const visible = item.authorId === userId || item.isPublic;
        const list = result.get(entry.packId) ?? [];
        list.push({
          itemId: entry.itemId,
          quantity: entry.quantity,
          item: visible
            ? {
                name: item.name,
                category: item.category,
                weight: item.weight,
                isPublic: item.isPublic,
                image: toItemImage(image),
              }
            : null,
        });
        result.set(entry.packId, list);
      }
      this.logger.debug(
        {
          durationMs: Date.now() - t0,
          userId,
          packs: packIds.length,
          rows: rows.length,
        },
        'Pack contents resolved',
      );
      return result;
    } catch (err: unknown) {
      this.logger.error(
        { err, durationMs: Date.now() - t0, userId, packs: packIds.length },
        'Pack contents resolution failed',
      );
      throw err;
    }
  }
}
