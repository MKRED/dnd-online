import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { ItemImageVariant } from 'shared';
import { DatabaseService } from '../database/database.service.js';
import { itemImageFiles, items } from '../database/schema/index.js';
import { visibleItem } from '../items/item-access.js';
import { ITEM_IMAGE_NOT_FOUND } from './item-image-access.js';

// Отдача байтов картинки предмета: её видит каждый, кто видит сам предмет.
@Injectable()
export class ItemImagesService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(ItemImagesService.name)
    private readonly logger: PinoLogger,
  ) {}

  async getFile(
    userId: string,
    itemId: string,
    variant: ItemImageVariant,
  ): Promise<Buffer> {
    const t0 = Date.now();
    try {
      const [row] = await this.databaseService.db
        .select({ data: itemImageFiles.data })
        .from(itemImageFiles)
        .innerJoin(items, eq(items.id, itemImageFiles.itemId))
        .where(
          and(visibleItem(userId, itemId), eq(itemImageFiles.variant, variant)),
        )
        .limit(1);
      this.logger.debug(
        { durationMs: Date.now() - t0, userId, itemId, variant, found: !!row },
        'Item image file lookup',
      );
      // Невидимый предмет и предмет без картинки неразличимы — оба 404.
      if (!row) throw new NotFoundException(ITEM_IMAGE_NOT_FOUND);
      return row.data;
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, durationMs: Date.now() - t0, userId, itemId, variant },
        'Item image file lookup failed',
      );
      throw err;
    }
  }
}
