import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { perDayFits, type MonsterAbilityEntry } from 'shared';
import { ABILITY_ACCESS } from '../../abilities/abilities.config.js';
import { visibleEntry } from '../../catalog/catalog-access.js';
import type { DbTransaction } from '../../database/database.service.js';
import { DatabaseService } from '../../database/database.service.js';
import { abilities, monsterAbilities } from '../../database/schema/index.js';
import { changeMonsterLinks } from '../monster-link-change.js';
import { loadMonsterAbilities } from './monster-abilities-loader.js';
import {
  MONSTER_ABILITY_ALREADY,
  MONSTER_ABILITY_ENTRY_NOT_FOUND,
  MONSTER_ABILITY_NOT_FOUND,
  MONSTER_ABILITY_PER_DAY_SPELL_ONLY,
} from './monster-abilities.messages.js';
import {
  AddMonsterAbilityDto,
  UpdateMonsterAbilityDto,
} from './dto/monster-ability.dto.js';

// Способности у монстра (docs/plan/monsters-npcs.md, этап 5). Права и ответ — общие для
// связей монстра (changeMonsterLinks).
@Injectable()
export class MonsterAbilitiesService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(MonsterAbilitiesService.name)
    private readonly logger: PinoLogger,
  ) {}

  add(userId: string, monsterId: string, dto: AddMonsterAbilityDto) {
    const perDay = dto.perDay ?? null;
    const log = { userId, monsterId, abilityId: dto.abilityId, perDay };
    return this.change('add', log, async (tx) => {
      // Добавить можно только то, что видишь сам, — как у персонажа. Монстру подходят все
      // категории: он колдует обычные заклинания и берёт общие способности.
      const [ability] = await tx
        .select({ id: abilities.id, category: abilities.category })
        .from(abilities)
        .where(visibleEntry(ABILITY_ACCESS, userId, dto.abilityId))
        .limit(1);
      if (!ability) throw new BadRequestException(MONSTER_ABILITY_NOT_FOUND);
      if (!perDayFits(ability, perDay)) {
        throw new BadRequestException(MONSTER_ABILITY_PER_DAY_SPELL_ONLY);
      }
      // Повтор упирается в уникальность и не вставляет строку.
      const inserted = await tx
        .insert(monsterAbilities)
        .values({ monsterId, abilityId: ability.id, perDay })
        .onConflictDoNothing()
        .returning({ id: monsterAbilities.id });
      if (inserted.length === 0) {
        throw new ConflictException(MONSTER_ABILITY_ALREADY);
      }
    });
  }

  // Снять ограничение можно всегда, задать — только у видимого автору монстра заклинания.
  update(
    userId: string,
    monsterId: string,
    entryId: string,
    dto: UpdateMonsterAbilityDto,
  ) {
    const log = { userId, monsterId, entryId, perDay: dto.perDay };
    return this.change('update', log, async (tx) => {
      const [row] = await tx
        .select({ ability: abilities })
        .from(monsterAbilities)
        .leftJoin(abilities, eq(abilities.id, monsterAbilities.abilityId))
        .where(this.entryOf(monsterId, entryId))
        .limit(1);
      if (!row) throw new NotFoundException(MONSTER_ABILITY_ENTRY_NOT_FOUND);
      const { ability } = row;
      const visible =
        ability && (ability.authorId === userId || ability.isPublic);
      if (!perDayFits(visible ? ability : null, dto.perDay)) {
        throw new BadRequestException(MONSTER_ABILITY_PER_DAY_SPELL_ONLY);
      }
      await tx
        .update(monsterAbilities)
        .set({ perDay: dto.perDay })
        .where(this.entryOf(monsterId, entryId));
    });
  }

  // Убрать можно любую строку, и скрытую, и удалённую автором.
  remove(userId: string, monsterId: string, entryId: string) {
    const log = { userId, monsterId, entryId };
    return this.change('remove', log, async (tx) => {
      const [row] = await tx
        .delete(monsterAbilities)
        .where(this.entryOf(monsterId, entryId))
        .returning({ id: monsterAbilities.id });
      if (!row) throw new NotFoundException(MONSTER_ABILITY_ENTRY_NOT_FOUND);
    });
  }

  private entryOf(monsterId: string, entryId: string) {
    return and(
      eq(monsterAbilities.id, entryId),
      eq(monsterAbilities.monsterId, monsterId),
    );
  }

  private change(
    kind: 'add' | 'update' | 'remove',
    log: { userId: string; monsterId: string } & Record<string, unknown>,
    apply: (tx: DbTransaction) => Promise<void>,
  ): Promise<MonsterAbilityEntry[]> {
    return changeMonsterLinks({
      databaseService: this.databaseService,
      logger: this.logger,
      links: 'abilities',
      kind,
      log,
      apply,
      load: loadMonsterAbilities,
    });
  }
}
