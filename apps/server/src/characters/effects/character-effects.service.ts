import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { CharacterEffectEntry } from 'shared';
import { visibleEntry } from '../../catalog/catalog-access.js';
import { assertOwnedCharacter } from '../../character-images/character-image-access.js';
import { assertSheetUnlocked } from '../../games/sheet-lock.js';
import { DatabaseService } from '../../database/database.service.js';
import { characterEffects, effects } from '../../database/schema/index.js';
import { EFFECT_ACCESS } from '../../effects/effects.config.js';
import { loadCharacterEffects } from './character-effects-loader.js';
import {
  CHARACTER_EFFECT_ALREADY,
  CHARACTER_EFFECT_ENTRY_NOT_FOUND,
  CHARACTER_EFFECT_NOT_FOUND,
} from './character-effects.messages.js';
import { AddCharacterEffectDto } from './dto/character-effect.dto.js';

// Эффекты на персонаже (docs/plan/done/character-effects.md). Накладывает и снимает только
// автор персонажа, отдельно от листа: каждая правка отдаёт список целиком.
@Injectable()
export class CharacterEffectsService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(CharacterEffectsService.name)
    private readonly logger: PinoLogger,
  ) {}

  async add(
    userId: string,
    characterId: string,
    dto: AddCharacterEffectDto,
  ): Promise<CharacterEffectEntry[]> {
    const t0 = Date.now();
    const log = { userId, characterId, effectId: dto.effectId };
    try {
      await this.databaseService.db.transaction(async (tx) => {
        await assertOwnedCharacter(tx, userId, characterId, {
          forUpdate: false,
        });
        await assertSheetUnlocked(tx, characterId);
        // Наложить можно только то, что видишь сам: чужой скрытый неотличим от
        // несуществующего. 400, а не 404: не найден эффект из тела, а не адрес.
        const [effect] = await tx
          .select({ id: effects.id })
          .from(effects)
          .where(visibleEntry(EFFECT_ACCESS, userId, dto.effectId))
          .limit(1);
        if (!effect) throw new BadRequestException(CHARACTER_EFFECT_NOT_FOUND);
        // Повтор упирается в уникальность и не вставляет строку — и при двух быстрых
        // кликах тоже.
        const inserted = await tx
          .insert(characterEffects)
          .values({
            characterId,
            effectId: effect.id,
            sourceEffectId: effect.id,
          })
          .onConflictDoNothing()
          .returning({ id: characterEffects.id });
        if (inserted.length === 0) {
          throw new ConflictException(CHARACTER_EFFECT_ALREADY);
        }
      });
      this.logger.info(
        { ...log, durationMs: Date.now() - t0 },
        'Character effect added',
      );
      return await this.effectsOf(userId, characterId);
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, ...log, durationMs: Date.now() - t0 },
        'Character effect add failed',
      );
      throw err;
    }
  }

  // Снять можно любую строку, и скрытую, и удалённую автором.
  async remove(
    userId: string,
    characterId: string,
    entryId: string,
  ): Promise<CharacterEffectEntry[]> {
    const t0 = Date.now();
    const log = { userId, characterId, entryId };
    try {
      await this.databaseService.db.transaction(async (tx) => {
        await assertOwnedCharacter(tx, userId, characterId, {
          forUpdate: false,
        });
        await assertSheetUnlocked(tx, characterId);
        const [row] = await tx
          .delete(characterEffects)
          .where(
            and(
              eq(characterEffects.id, entryId),
              eq(characterEffects.characterId, characterId),
            ),
          )
          .returning({ id: characterEffects.id });
        if (!row) throw new NotFoundException(CHARACTER_EFFECT_ENTRY_NOT_FOUND);
      });
      this.logger.info(
        { ...log, durationMs: Date.now() - t0 },
        'Character effect removed',
      );
      return await this.effectsOf(userId, characterId);
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, ...log, durationMs: Date.now() - t0 },
        'Character effect removal failed',
      );
      throw err;
    }
  }

  private async effectsOf(userId: string, characterId: string) {
    const t0 = Date.now();
    const list = await loadCharacterEffects(
      this.databaseService.db,
      userId,
      characterId,
    );
    this.logger.debug(
      { durationMs: Date.now() - t0, userId, characterId, count: list.length },
      'Character effects loaded',
    );
    return list;
  }
}
