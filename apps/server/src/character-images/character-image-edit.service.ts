import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CHARACTER_IMAGE_MAX_COUNT, type ThumbCrop } from 'shared';
import {
  DatabaseService,
  type DbTransaction,
} from '../database/database.service.js';
import {
  characterImageFiles,
  characterImages,
} from '../database/schema/index.js';
import {
  assertOwnedCharacter,
  findImage,
  toCharacterImage,
} from './character-image-access.js';
import { UpdateCharacterImageDto } from './dto/update-character-image.dto.js';
import {
  processUpload,
  renderThumb,
  UnsupportedImageError,
} from './image-processing.js';
import { thumbCropError } from './thumb-crop.js';

// Правки галереи. Каждая идёт в транзакции с блокировкой строки персонажа, поэтому
// лимит, порядок и «основная ровно одна» не ломаются параллельными запросами.
@Injectable()
export class CharacterImageEditService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(CharacterImageEditService.name)
    private readonly logger: PinoLogger,
  ) {}

  upload(userId: string, characterId: string, file: Buffer) {
    return this.run('upload', { userId, characterId }, async () => {
      const { db } = this.databaseService;
      // До тяжёлой обработки: чужому персонажу сразу 404, без траты процессора.
      await assertOwnedCharacter(db, userId, characterId, { forUpdate: false });
      const image = await processUpload(file).catch((err: unknown) => {
        if (!(err instanceof UnsupportedImageError)) throw err;
        this.logger.info({ err, characterId }, 'Character image rejected');
        throw new BadRequestException(
          'Не удалось прочитать картинку. Подойдут JPEG, PNG и WebP',
        );
      });
      return db.transaction(async (tx) => {
        await assertOwnedCharacter(tx, userId, characterId, {
          forUpdate: true,
        });
        const [stats] = await tx
          .select({
            count: sql<number>`count(*)::int`,
            lastPosition: sql<number>`coalesce(max(${characterImages.position}), -1)::int`,
          })
          .from(characterImages)
          .where(eq(characterImages.characterId, characterId));
        if (stats.count >= CHARACTER_IMAGE_MAX_COUNT) {
          throw new BadRequestException(
            `У персонажа уже ${CHARACTER_IMAGE_MAX_COUNT} картинок — больше добавить нельзя`,
          );
        }
        const [row] = await tx
          .insert(characterImages)
          .values({
            characterId,
            position: stats.lastPosition + 1,
            // Первая картинка сразу основная: частый случай без лишнего клика.
            isMain: stats.count === 0,
            width: image.width,
            height: image.height,
            thumbCrop: image.thumbCrop,
          })
          .returning();
        await tx.insert(characterImageFiles).values([
          { imageId: row.id, variant: 'full', data: image.full },
          { imageId: row.id, variant: 'preview', data: image.preview },
          { imageId: row.id, variant: 'thumb', data: image.thumb },
        ]);
        return toCharacterImage(row);
      });
    });
  }

  update(
    userId: string,
    characterId: string,
    imageId: string,
    dto: UpdateCharacterImageDto,
  ) {
    return this.run('update', { userId, characterId, imageId }, () =>
      this.databaseService.db.transaction(async (tx) => {
        await assertOwnedCharacter(tx, userId, characterId, {
          forUpdate: true,
        });
        const image = await findImage(tx, characterId, imageId);
        if (dto.thumbCrop) await this.recrop(tx, image, dto.thumbCrop);
        if (dto.isMain && !image.isMain) {
          // Сначала снять флаг с прежней: уникальный индекс не допускает двух основных.
          await tx
            .update(characterImages)
            .set({ isMain: false })
            .where(
              and(
                eq(characterImages.characterId, characterId),
                eq(characterImages.isMain, true),
              ),
            );
          await tx
            .update(characterImages)
            .set({ isMain: true })
            .where(eq(characterImages.id, imageId));
        }
        return toCharacterImage(await findImage(tx, characterId, imageId));
      }),
    );
  }

  remove(userId: string, characterId: string, imageId: string) {
    return this.run('remove', { userId, characterId, imageId }, () =>
      this.databaseService.db.transaction(async (tx) => {
        await assertOwnedCharacter(tx, userId, characterId, {
          forUpdate: true,
        });
        const image = await findImage(tx, characterId, imageId);
        await tx.delete(characterImages).where(eq(characterImages.id, imageId));
        if (!image.isMain) return;
        // Портрет не должен пропадать, пока в галерее что-то есть: основной
        // становится следующая по порядку.
        const [next] = await tx
          .select({ id: characterImages.id })
          .from(characterImages)
          .where(eq(characterImages.characterId, characterId))
          .orderBy(
            asc(characterImages.position),
            asc(characterImages.createdAt),
          )
          .limit(1);
        if (next) {
          await tx
            .update(characterImages)
            .set({ isMain: true })
            .where(eq(characterImages.id, next.id));
        }
      }),
    );
  }

  private async recrop(
    tx: DbTransaction,
    image: typeof characterImages.$inferSelect,
    crop: ThumbCrop,
  ): Promise<void> {
    const error = thumbCropError(crop, image.width, image.height);
    if (error) throw new BadRequestException(error);
    const variantOf = (variant: 'full' | 'thumb') =>
      and(
        eq(characterImageFiles.imageId, image.id),
        eq(characterImageFiles.variant, variant),
      );
    const [full] = await tx
      .select({ data: characterImageFiles.data })
      .from(characterImageFiles)
      .where(variantOf('full'));
    const thumb = await renderThumb(full.data, crop);
    await tx
      .update(characterImageFiles)
      .set({ data: thumb })
      .where(variantOf('thumb'));
    await tx
      .update(characterImages)
      .set({ thumbCrop: crop, thumbVersion: image.thumbVersion + 1 })
      .where(eq(characterImages.id, image.id));
  }

  // Общая обвязка: длительность, лог результата; ожидаемые отказы (404, 400) не ошибки.
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
        'Character image changed',
      );
      return result;
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, durationMs: Date.now() - t0, action, ...context },
        'Character image change failed',
      );
      throw err;
    }
  }
}
