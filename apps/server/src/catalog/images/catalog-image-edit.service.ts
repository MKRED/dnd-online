import {
  BadRequestException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import type { PinoLogger } from 'nestjs-pino';
import {
  catalogThumbCropError,
  defaultCatalogThumbCrop,
  type CatalogImage,
  type CatalogImageVariant,
  type ThumbCrop,
} from 'shared';
import type {
  DatabaseService,
  DbTransaction,
} from '../../database/database.service.js';
import {
  decodeToFull,
  UnsupportedImageError,
} from '../../images/decode-image.js';
import {
  authoredEntry,
  lockAuthoredEntry,
  rejectCatalogEdit,
} from '../catalog-access.js';
import { toCatalogImage } from '../catalog-image.mapper.js';
import type { CatalogImageConfig } from './catalog-image.config.js';
import { renderCatalogThumb } from './catalog-thumb.js';

// Правки картинки записи каталога: загрузка (она же замена), вырез миниатюры, удаление.
// Только автор; каждая правка идёт в транзакции с блокировкой строки записи. Каждый
// каталог наследует этот класс со своими таблицами и логгером.
export abstract class CatalogImageEditService {
  protected constructor(
    private readonly databaseService: DatabaseService,
    private readonly logger: PinoLogger,
    private readonly config: CatalogImageConfig,
  ) {}

  upload(userId: string, ownerId: string, file: Buffer): Promise<CatalogImage> {
    const { access, tables } = this.config;
    return this.run('upload', { userId, ownerId }, async () => {
      const { db } = this.databaseService;
      // До тяжёлой обработки: не автору сразу отказ, без траты процессора.
      const [own] = await db
        .select({ id: access.id })
        .from(access.table)
        .where(authoredEntry(access, userId, ownerId))
        .limit(1);
      if (!own) await rejectCatalogEdit(db, access, userId, ownerId);
      const full = await decodeToFull(file).catch((err: unknown) => {
        if (!(err instanceof UnsupportedImageError)) throw err;
        this.logger.info({ err, ownerId }, 'Catalog image rejected');
        throw new BadRequestException(
          'Не удалось прочитать картинку. Подойдут JPEG, PNG и WebP',
        );
      });
      const thumbCrop = defaultCatalogThumbCrop(full.width, full.height);
      const thumb = await renderCatalogThumb(
        full.data,
        full.width,
        full.height,
        thumbCrop,
      );
      return db.transaction(async (tx) => {
        await lockAuthoredEntry(tx, access, userId, ownerId);
        // Замена — та же запись: вырез сбрасывается к картинке целиком, версия растёт.
        const meta = { width: full.width, height: full.height, thumbCrop };
        const [row] = await tx
          .insert(tables.images)
          .values({ ownerId, ...meta })
          .onConflictDoUpdate({
            target: tables.images.ownerId,
            set: { ...meta, version: sql`${tables.images.version} + 1` },
          })
          .returning();
        await tx
          .insert(tables.files)
          .values([
            { ownerId, variant: 'full', data: full.data },
            { ownerId, variant: 'thumb', data: thumb },
          ])
          .onConflictDoUpdate({
            target: [tables.files.ownerId, tables.files.variant],
            set: { data: sql`excluded.data` },
          });
        return toCatalogImage(row);
      });
    });
  }

  recrop(
    userId: string,
    ownerId: string,
    crop: ThumbCrop,
  ): Promise<CatalogImage> {
    const { access, tables } = this.config;
    return this.run('recrop', { userId, ownerId }, () =>
      this.databaseService.db.transaction(async (tx) => {
        await lockAuthoredEntry(tx, access, userId, ownerId);
        const image = await this.findImage(tx, ownerId);
        const error = catalogThumbCropError(crop, image.width, image.height);
        if (error) throw new BadRequestException(error);
        const variantOf = (variant: CatalogImageVariant) =>
          and(
            eq(tables.files.ownerId, ownerId),
            eq(tables.files.variant, variant),
          );
        const [full] = await tx
          .select({ data: tables.files.data })
          .from(tables.files)
          .where(variantOf('full'));
        const thumb = await renderCatalogThumb(
          full.data,
          image.width,
          image.height,
          crop,
        );
        await tx
          .update(tables.files)
          .set({ data: thumb })
          .where(variantOf('thumb'));
        const [row] = await tx
          .update(tables.images)
          .set({ thumbCrop: crop, version: image.version + 1 })
          .where(eq(tables.images.ownerId, ownerId))
          .returning();
        return toCatalogImage(row);
      }),
    );
  }

  remove(userId: string, ownerId: string): Promise<void> {
    const { access, tables, noImage } = this.config;
    return this.run('remove', { userId, ownerId }, () =>
      this.databaseService.db.transaction(async (tx) => {
        await lockAuthoredEntry(tx, access, userId, ownerId);
        // Байты уходят каскадом.
        const [row] = await tx
          .delete(tables.images)
          .where(eq(tables.images.ownerId, ownerId))
          .returning({ ownerId: tables.images.ownerId });
        if (!row) throw new NotFoundException(noImage);
      }),
    );
  }

  private async findImage(tx: DbTransaction, ownerId: string) {
    const { images } = this.config.tables;
    const [row] = await tx
      .select()
      .from(images)
      .where(eq(images.ownerId, ownerId))
      .limit(1);
    if (!row) throw new NotFoundException(this.config.noImage);
    return row;
  }

  // Общая обвязка правок: длительность, лог результата; ожидаемые отказы — не ошибки.
  private async run<T>(
    action: string,
    context: Record<string, string>,
    work: () => Promise<T>,
  ): Promise<T> {
    const t0 = Date.now();
    const meta = { catalog: this.config.catalog, action, ...context };
    try {
      const result = await work();
      this.logger.info(
        { durationMs: Date.now() - t0, ...meta },
        'Catalog image changed',
      );
      return result;
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, durationMs: Date.now() - t0, ...meta },
        'Catalog image change failed',
      );
      throw err;
    }
  }
}
