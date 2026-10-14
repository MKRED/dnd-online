import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { CharacterImage, CharacterImageVariant } from 'shared';
import { DatabaseService } from '../database/database.service.js';
import {
  characterImageFiles,
  characterImages,
} from '../database/schema/index.js';
import {
  assertOwnedCharacter,
  IMAGE_NOT_FOUND,
  toCharacterImage,
} from './character-image-access.js';

// Чтение галереи: список метаданных и байты вариантов. Правки — в CharacterImageEditService.
@Injectable()
export class CharacterImagesService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(CharacterImagesService.name)
    private readonly logger: PinoLogger,
  ) {}

  async list(userId: string, characterId: string): Promise<CharacterImage[]> {
    const t0 = Date.now();
    try {
      const { db } = this.databaseService;
      await assertOwnedCharacter(db, userId, characterId, { forUpdate: false });
      const rows = await db
        .select()
        .from(characterImages)
        .where(eq(characterImages.characterId, characterId))
        .orderBy(asc(characterImages.position), asc(characterImages.createdAt));
      this.logger.debug(
        { durationMs: Date.now() - t0, characterId, count: rows.length },
        'Character images listed',
      );
      return rows.map(toCharacterImage);
    } catch (err: unknown) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error(
        { err, userId, characterId },
        'Character image listing failed',
      );
      throw err;
    }
  }

  async getFile(
    userId: string,
    characterId: string,
    imageId: string,
    variant: CharacterImageVariant,
  ): Promise<Buffer> {
    const t0 = Date.now();
    try {
      const { db } = this.databaseService;
      await assertOwnedCharacter(db, userId, characterId, { forUpdate: false });
      const [row] = await db
        .select({ data: characterImageFiles.data })
        .from(characterImageFiles)
        .innerJoin(
          characterImages,
          eq(characterImages.id, characterImageFiles.imageId),
        )
        .where(
          and(
            eq(characterImages.id, imageId),
            eq(characterImages.characterId, characterId),
            eq(characterImageFiles.variant, variant),
          ),
        )
        .limit(1);
      if (!row) throw new NotFoundException(IMAGE_NOT_FOUND);
      this.logger.debug(
        {
          durationMs: Date.now() - t0,
          imageId,
          variant,
          bytes: row.data.length,
        },
        'Character image file read',
      );
      return row.data;
    } catch (err: unknown) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error(
        { err, userId, characterId, imageId, variant },
        'Character image file read failed',
      );
      throw err;
    }
  }
}
