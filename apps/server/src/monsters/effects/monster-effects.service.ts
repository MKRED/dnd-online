import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { MonsterEffectEntry } from 'shared';
import { visibleEntry } from '../../catalog/catalog-access.js';
import type { DbTransaction } from '../../database/database.service.js';
import { DatabaseService } from '../../database/database.service.js';
import { effects, monsterEffects } from '../../database/schema/index.js';
import { EFFECT_ACCESS } from '../../effects/effects.config.js';
import { changeMonsterLinks } from '../monster-link-change.js';
import { loadMonsterEffects } from './monster-effects-loader.js';
import {
  MONSTER_EFFECT_ALREADY,
  MONSTER_EFFECT_ENTRY_NOT_FOUND,
  MONSTER_EFFECT_NOT_FOUND,
} from './monster-effects.messages.js';
import { AddMonsterEffectDto } from './dto/monster-effect.dto.js';

// Постоянные эффекты монстра (docs/plan/done/monsters-npcs.md, этап 6). Права и ответ — общие
// для связей монстра (changeMonsterLinks).
@Injectable()
export class MonsterEffectsService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(MonsterEffectsService.name)
    private readonly logger: PinoLogger,
  ) {}

  add(userId: string, monsterId: string, dto: AddMonsterEffectDto) {
    const log = { userId, monsterId, effectId: dto.effectId };
    return this.change('add', log, async (tx) => {
      // Наложить можно только то, что видишь сам, — как на персонажа.
      const [effect] = await tx
        .select({ id: effects.id })
        .from(effects)
        .where(visibleEntry(EFFECT_ACCESS, userId, dto.effectId))
        .limit(1);
      if (!effect) throw new BadRequestException(MONSTER_EFFECT_NOT_FOUND);
      const inserted = await tx
        .insert(monsterEffects)
        .values({ monsterId, effectId: effect.id })
        .onConflictDoNothing()
        .returning({ id: monsterEffects.id });
      if (inserted.length === 0) {
        throw new ConflictException(MONSTER_EFFECT_ALREADY);
      }
    });
  }

  // Снять можно любую строку, и скрытую, и удалённую автором.
  remove(userId: string, monsterId: string, entryId: string) {
    const log = { userId, monsterId, entryId };
    return this.change('remove', log, async (tx) => {
      const [row] = await tx
        .delete(monsterEffects)
        .where(
          and(
            eq(monsterEffects.id, entryId),
            eq(monsterEffects.monsterId, monsterId),
          ),
        )
        .returning({ id: monsterEffects.id });
      if (!row) throw new NotFoundException(MONSTER_EFFECT_ENTRY_NOT_FOUND);
    });
  }

  private change(
    kind: 'add' | 'remove',
    log: { userId: string; monsterId: string } & Record<string, unknown>,
    apply: (tx: DbTransaction) => Promise<void>,
  ): Promise<MonsterEffectEntry[]> {
    return changeMonsterLinks({
      databaseService: this.databaseService,
      logger: this.logger,
      links: 'effects',
      kind,
      log,
      apply,
      load: loadMonsterEffects,
    });
  }
}
