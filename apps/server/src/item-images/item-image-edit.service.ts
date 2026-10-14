import {
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  defaultItemThumbCrop,
  itemThumbCropError,
  type ItemImage,
  type ItemImageVariant,
  type ThumbCrop,
} from 'shared';
import { DatabaseService } from '../database/database.service.js';
import { itemImageFiles, itemImages, items } from '../database/schema/index.js';
import { decodeToFull, UnsupportedImageError } from '../images/decode-image.js';
import { authoredItem, rejectEdit } from '../items/item-access.js';
import {
  findItemImage,
  ITEM_IMAGE_NOT_FOUND,
  lockAuthoredItem,
  toItemImage,
} from './item-image-access.js';
import { renderItemThumb } from './item-thumb.js';

// Правки картинки предмета: загрузка (она же замена), вырез миниатюры, удаление.
// Только автор; каждая правка идёт в транзакции с блокировкой строки предмета.
@Injectable()
export class ItemImageEditService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(ItemImageEditService.name)
    private readonly logger: PinoLogger,
  ) {}

  upload(userId: string, itemId: string, file: Buffer): Promise<ItemImage> {
    return this.run('upload', { userId, itemId }, async () => {
      const { db } = this.databaseService;
      // До тяжёлой обработки: не автору сразу отказ, без траты процессора.
      const [own] = await db
        .select({ id: items.id })
        .from(items)
        .where(authoredItem(userId, itemId))
        .limit(1);
      if (!own) await rejectEdit(db, userId, itemId);
      const full = await decodeToFull(file).catch((err: unknown) => {
        if (!(err instanceof UnsupportedImageError)) throw err;
        this.logger.info({ err, itemId }, 'Item image rejected');
        throw new BadRequestException(
          'Не удалось прочитать картинку. Подойдут JPEG, PNG и WebP',
        );
      });
      const thumbCrop = defaultItemThumbCrop(full.width, full.height);
      const thumb = await renderItemThumb(
        full.data,
        full.width,
        full.height,
        thumbCrop,
      );
      return db.transaction(async (tx) => {
        await lockAuthoredItem(tx, userId, itemId);
        // Замена — та же запись: вырез сбрасывается к картинке целиком, версия растёт.
        const meta = { width: full.width, height: full.height, thumbCrop };
        const [row] = await tx
          .insert(itemImages)
          .values({ itemId, ...meta })
          .onConflictDoUpdate({
            target: itemImages.itemId,
            set: { ...meta, version: sql`${itemImages.version} + 1` },
          })
          .returning();
        await tx
          .insert(itemImageFiles)
          .values([
            { itemId, variant: 'full', data: full.data },
            { itemId, variant: 'thumb', data: thumb },
          ])
          .onConflictDoUpdate({
            target: [itemImageFiles.itemId, itemImageFiles.variant],
            set: { data: sql`excluded.data` },
          });
        return toItemImage(row);
      });
    });
  }

  recrop(userId: string, itemId: string, crop: ThumbCrop): Promise<ItemImage> {
    return this.run('recrop', { userId, itemId }, () =>
      this.databaseService.db.transaction(async (tx) => {
        await lockAuthoredItem(tx, userId, itemId);
        const image = await findItemImage(tx, itemId);
        const error = itemThumbCropError(crop, image.width, image.height);
        if (error) throw new BadRequestException(error);
        const variantOf = (variant: ItemImageVariant) =>
          and(
            eq(itemImageFiles.itemId, itemId),
            eq(itemImageFiles.variant, variant),
          );
        const [full] = await tx
          .select({ data: itemImageFiles.data })
          .from(itemImageFiles)
          .where(variantOf('full'));
        const thumb = await renderItemThumb(
          full.data,
          image.width,
          image.height,
          crop,
        );
        await tx
          .update(itemImageFiles)
          .set({ data: thumb })
          .where(variantOf('thumb'));
        const [row] = await tx
          .update(itemImages)
          .set({ thumbCrop: crop, version: image.version + 1 })
          .where(eq(itemImages.itemId, itemId))
          .returning();
        return toItemImage(row);
      }),
    );
  }

  remove(userId: string, itemId: string): Promise<void> {
    return this.run('remove', { userId, itemId }, () =>
      this.databaseService.db.transaction(async (tx) => {
        await lockAuthoredItem(tx, userId, itemId);
        // Байты уходят каскадом.
        const [row] = await tx
          .delete(itemImages)
          .where(eq(itemImages.itemId, itemId))
          .returning({ itemId: itemImages.itemId });
        if (!row) throw new NotFoundException(ITEM_IMAGE_NOT_FOUND);
      }),
    );
  }

  // Общая обвязка правок: длительность, лог результата; ожидаемые отказы — не ошибки.
  private async run<T>(
    action: string,
    context: Record<string, string>,
    work: () => Promise<T>,
  ): Promise<T> {
    const t0 = Date.now();
    try {
      const result = await work();
      this.logger.info(
        { durationMs: Date.now() - t0, action, ...context },
        'Item image changed',
      );
      return result;
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, durationMs: Date.now() - t0, action, ...context },
        'Item image change failed',
      );
      throw err;
    }
  }
}
