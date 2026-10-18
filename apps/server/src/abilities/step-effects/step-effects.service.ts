import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { and, asc, eq, inArray, or } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  stepEffectLinks,
  type AbilityStep,
  type CatalogEntryFields,
} from 'shared';
import {
  DatabaseService,
  type DbTransaction,
} from '../../database/database.service.js';
import {
  abilityStepEffects,
  effectImages,
  effects,
} from '../../database/schema/index.js';
import { toCatalogImage } from '../../catalog/catalog-image.mapper.js';
import {
  STEP_EFFECT_NOT_FOUND,
  hiddenEffectsError,
  type StepEffectsPublication,
} from './step-effects.rules.js';

// Эффекты в исходах шагов способности (docs/plan/abilities.md, этап 8): запись строк
// вместе со способностью, проверка ссылок и подстановка эффектов в шаги для читателя.
// Образец — состав набора (items/pack-contents).
@Injectable()
export class StepEffectsService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(StepEffectsService.name)
    private readonly logger: PinoLogger,
  ) {}

  // Заменяет эффекты всех шагов способности целиком внутри транзакции её записи.
  async replace(
    tx: DbTransaction,
    userId: string,
    abilityId: string,
    steps: readonly AbilityStep[],
    publication: StepEffectsPublication,
  ): Promise<void> {
    const t0 = Date.now();
    await tx
      .delete(abilityStepEffects)
      .where(eq(abilityStepEffects.abilityId, abilityId));
    const links = stepEffectLinks(steps);
    if (links.length === 0) return;

    // Ссылаться можно только на эффекты, которые автор способности видит сейчас: свои (и
    // скрытые) и опубликованные чужие.
    const ids = [...new Set(links.map((link) => link.effectId))];
    const found = await tx
      .select({
        id: effects.id,
        name: effects.name,
        isPublic: effects.isPublic,
      })
      .from(effects)
      .where(
        and(
          inArray(effects.id, ids),
          or(eq(effects.authorId, userId), eq(effects.isPublic, true)),
        ),
      );
    if (found.length !== ids.length) {
      this.logger.info(
        { userId, abilityId, requested: ids.length, found: found.length },
        'Step effects rejected: not found',
      );
      throw new BadRequestException(STEP_EFFECT_NOT_FOUND);
    }
    if (publication.isPublic)
      await this.publishEffects(tx, userId, abilityId, found, publication);

    // Порядок — внутри исхода; номера шага и исхода у строки свои.
    const positions = new Map<string, number>();
    await tx.insert(abilityStepEffects).values(
      links.map(({ step, outcome, effectId }) => {
        const key = `${step}:${outcome}`;
        const position = positions.get(key) ?? 0;
        positions.set(key, position + 1);
        return { abilityId, step, outcome, effectId, position };
      }),
    );
    this.logger.debug(
      { durationMs: Date.now() - t0, userId, abilityId, links: links.length },
      'Step effects replaced',
    );
  }

  // Опубликованная способность — только с опубликованными эффектами (решено с
  // пользователем). Скрытыми среди найденных могут быть только свои: чужие отсеяны выше.
  private async publishEffects(
    tx: DbTransaction,
    userId: string,
    abilityId: string,
    found: readonly { id: string; name: string; isPublic: boolean }[],
    { publishEffects }: StepEffectsPublication,
  ): Promise<void> {
    const hidden = found.filter((effect) => !effect.isPublic);
    if (hidden.length === 0) return;
    if (!publishEffects) {
      this.logger.info(
        { userId, abilityId, hidden: hidden.length },
        'Ability publication rejected: hidden effects',
      );
      throw new ConflictException(hiddenEffectsError(hidden));
    }
    await tx
      .update(effects)
      .set({ isPublic: true })
      .where(
        and(
          inArray(
            effects.id,
            hidden.map((effect) => effect.id),
          ),
          eq(effects.authorId, userId),
        ),
      );
    this.logger.info(
      { userId, abilityId, published: hidden.length },
      'Step effects published with the ability',
    );
  }

  // Эффекты в шаги нескольких способностей одним запросом — для списка и карточки (меняет
  // шаги на месте). Карточку эффекта получает только тот, кто этот эффект видит;
  // остальным — effect: null.
  async attach(
    userId: string,
    abilities: readonly ({ steps: AbilityStep[] } & CatalogEntryFields)[],
  ): Promise<void> {
    if (abilities.length === 0) return;
    const t0 = Date.now();
    const byId = new Map(abilities.map((ability) => [ability.id, ability]));
    try {
      const rows = await this.databaseService.db
        .select({
          link: abilityStepEffects,
          effect: effects,
          image: effectImages,
        })
        .from(abilityStepEffects)
        .innerJoin(effects, eq(effects.id, abilityStepEffects.effectId))
        .leftJoin(effectImages, eq(effectImages.ownerId, effects.id))
        .where(inArray(abilityStepEffects.abilityId, [...byId.keys()]))
        .orderBy(asc(abilityStepEffects.position));
      for (const { link, effect, image } of rows) {
        // Шаг мог не прочитаться (испорченный в базе) — его эффекты некуда положить.
        const step = byId.get(link.abilityId)?.steps[link.step];
        if (!step || (link.outcome !== 'hit' && link.outcome !== 'miss'))
          continue;
        const visible = effect.authorId === userId || effect.isPublic;
        // Новый список, а не push: у шага, прочитанного с умолчаниями, список эффектов —
        // общий объект из STEP_STORED_DEFAULTS.
        const outcome = step[link.outcome];
        outcome.effects = [
          ...outcome.effects,
          {
            effectId: link.effectId,
            effect: visible
              ? {
                  name: effect.name,
                  isPublic: effect.isPublic,
                  image: toCatalogImage(image),
                }
              : null,
          },
        ];
      }
      this.logger.debug(
        {
          durationMs: Date.now() - t0,
          userId,
          abilities: abilities.length,
          rows: rows.length,
        },
        'Step effects attached',
      );
    } catch (err: unknown) {
      this.logger.error(
        {
          err,
          durationMs: Date.now() - t0,
          userId,
          abilities: abilities.length,
        },
        'Step effects attachment failed',
      );
      throw err;
    }
  }
}
