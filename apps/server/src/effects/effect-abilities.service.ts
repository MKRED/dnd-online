import { Injectable } from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { EffectAbilities } from 'shared';
import {
  DatabaseService,
  type DbTransaction,
} from '../database/database.service.js';
import { abilities, abilityStepEffects } from '../database/schema/index.js';

// Какие способности накладывают эффект: для подтверждения удаления и для скрытия своих
// способностей вместе с эффектом (docs/plan/done/abilities.md, этап 8). Образец — наборы, где
// лежит предмет (items/pack-contents/pack-usage.service.ts).
@Injectable()
export class EffectAbilitiesService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(EffectAbilitiesService.name)
    private readonly logger: PinoLogger,
  ) {}

  // Только для автора эффекта. Свои способности — по названию, чужие — числом: чужая
  // может быть скрыта, и её название автору эффекта знать незачем. Способность с эффектом
  // в нескольких шагах считается один раз.
  async abilitiesOf(
    userId: string,
    effectId: string,
  ): Promise<EffectAbilities> {
    const t0 = Date.now();
    try {
      const rows = await this.databaseService.db
        .selectDistinct({
          id: abilities.id,
          name: abilities.name,
          isPublic: abilities.isPublic,
          authorId: abilities.authorId,
        })
        .from(abilityStepEffects)
        .innerJoin(abilities, eq(abilities.id, abilityStepEffects.abilityId))
        .where(eq(abilityStepEffects.effectId, effectId))
        .orderBy(asc(abilities.name), asc(abilities.id));
      const mine = rows
        .filter((row) => row.authorId === userId)
        .map(({ id, name, isPublic }) => ({ id, name, isPublic }));
      this.logger.debug(
        {
          durationMs: Date.now() - t0,
          userId,
          effectId,
          abilities: rows.length,
        },
        'Effect abilities looked up',
      );
      return { mine, othersCount: rows.length - mine.length };
    } catch (err: unknown) {
      this.logger.error(
        { err, durationMs: Date.now() - t0, userId, effectId },
        'Effect abilities lookup failed',
      );
      throw err;
    }
  }

  // Эффект скрывают вместе с его опубликованными способностями автора — одной транзакцией
  // с правкой эффекта. Чужие способности не трогаем: в них строка станет «скрыт автором».
  async hideOwnAbilities(
    tx: DbTransaction,
    userId: string,
    effectId: string,
  ): Promise<void> {
    const abilityIds = tx
      .select({ id: abilityStepEffects.abilityId })
      .from(abilityStepEffects)
      .where(eq(abilityStepEffects.effectId, effectId));
    const hidden = await tx
      .update(abilities)
      .set({ isPublic: false })
      .where(
        and(
          inArray(abilities.id, abilityIds),
          eq(abilities.authorId, userId),
          eq(abilities.isPublic, true),
        ),
      )
      .returning({ id: abilities.id });
    this.logger.info(
      { userId, effectId, hidden: hidden.length },
      'Own abilities hidden with the effect',
    );
  }
}
