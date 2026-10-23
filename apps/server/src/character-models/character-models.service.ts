import {
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  defaultModelFit,
  detectModelFormat,
  STL_DEFAULT_COLOR,
  type CharacterModel,
  type CharacterModelFormat,
} from 'shared';
import {
  assertOwnedCharacter,
  assertViewableCharacter,
} from '../character-images/character-image-access.js';
import { DatabaseService } from '../database/database.service.js';
import { characterModels } from '../database/schema/index.js';
import {
  findModel,
  MODEL_NOT_FOUND,
  modelColumns,
  requireModel,
  toCharacterModel,
} from './character-model-row.js';
import type { PatchCharacterModelDto } from './dto/patch-character-model.dto.js';

// 3D-модель персонажа (docs/plan/done/character-models.md). Смотреть может тот, кто видит
// персонажа (автор или зритель по ссылке); загружать, править и удалять — автор.
@Injectable()
export class CharacterModelsService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(CharacterModelsService.name)
    private readonly logger: PinoLogger,
  ) {}

  get(userId: string, characterId: string): Promise<CharacterModel | null> {
    return this.run('read', { userId, characterId }, async () => {
      const { db } = this.databaseService;
      await assertViewableCharacter(db, userId, characterId);
      return findModel(db, characterId);
    });
  }

  file(
    userId: string,
    characterId: string,
  ): Promise<{ data: Buffer; format: CharacterModelFormat }> {
    return this.run('file', { userId, characterId }, async () => {
      const { db } = this.databaseService;
      await assertViewableCharacter(db, userId, characterId);
      const [row] = await db
        .select({ data: characterModels.data, format: characterModels.format })
        .from(characterModels)
        .where(eq(characterModels.characterId, characterId))
        .limit(1);
      if (!row) throw new NotFoundException(MODEL_NOT_FOUND);
      return row;
    });
  }

  // Новый файл заменяет прежний; поправка и цвет — по умолчанию для его формата:
  // от другой модели они не подходят.
  upload(
    userId: string,
    characterId: string,
    data: Buffer,
  ): Promise<CharacterModel> {
    return this.run('upload', { userId, characterId }, async () => {
      const format = detectModelFormat(data);
      if (!format) {
        throw new BadRequestException(
          'Не удалось распознать модель. Подойдут .glb и STL',
        );
      }
      const { db } = this.databaseService;
      await assertOwnedCharacter(db, userId, characterId, { forUpdate: false });
      const values = {
        format,
        size: data.length,
        color: format === 'stl' ? STL_DEFAULT_COLOR : null,
        fit: defaultModelFit(format),
        data,
        updatedAt: new Date(),
      };
      const [row] = await db
        .insert(characterModels)
        .values({ characterId, ...values })
        .onConflictDoUpdate({
          target: characterModels.characterId,
          set: { ...values, version: sql`${characterModels.version} + 1` },
        })
        .returning(modelColumns);
      return toCharacterModel(row);
    });
  }

  patch(
    userId: string,
    characterId: string,
    dto: PatchCharacterModelDto,
  ): Promise<CharacterModel> {
    return this.run('patch', { userId, characterId }, async () => {
      const { db } = this.databaseService;
      await assertOwnedCharacter(db, userId, characterId, { forUpdate: false });
      const model = await requireModel(db, characterId);
      if (dto.color !== undefined && model.format !== 'stl') {
        throw new BadRequestException(
          'Цвет задаётся только у модели STL: у .glb свои цвета',
        );
      }
      const [row] = await db
        .update(characterModels)
        .set({
          ...(dto.color !== undefined && { color: dto.color.toLowerCase() }),
          ...(dto.fit && { fit: dto.fit }),
          updatedAt: new Date(),
        })
        .where(eq(characterModels.characterId, characterId))
        .returning(modelColumns);
      return toCharacterModel(row);
    });
  }

  remove(userId: string, characterId: string): Promise<void> {
    return this.run('remove', { userId, characterId }, async () => {
      const { db } = this.databaseService;
      await assertOwnedCharacter(db, userId, characterId, { forUpdate: false });
      const deleted = await db
        .delete(characterModels)
        .where(eq(characterModels.characterId, characterId))
        .returning({ characterId: characterModels.characterId });
      if (deleted.length === 0) throw new NotFoundException(MODEL_NOT_FOUND);
    });
  }

  // Ошибки запроса (404, 400) — ожидаемые, их не пишем в лог ошибкой.
  private async run<T>(
    action: string,
    context: { userId: string; characterId: string },
    work: () => Promise<T>,
  ): Promise<T> {
    const t0 = Date.now();
    try {
      const result = await work();
      this.logger.info(
        { ...context, action, durationMs: Date.now() - t0 },
        'Character model request done',
      );
      return result;
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, ...context, action },
        'Character model request failed',
      );
      throw err;
    }
  }
}
