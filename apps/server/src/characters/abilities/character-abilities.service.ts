import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { canBePrepared, type CharacterAbilityEntry } from 'shared';
import {
  ABILITY_ACCESS,
  toAbilityVariant,
} from '../../abilities/abilities.config.js';
import { visibleEntry } from '../../catalog/catalog-access.js';
import { assertOwnedCharacter } from '../../character-images/character-image-access.js';
import type { DbTransaction } from '../../database/database.service.js';
import { DatabaseService } from '../../database/database.service.js';
import { abilities, characterAbilities } from '../../database/schema/index.js';
import { loadCharacterAbilities } from './character-abilities-loader.js';
import {
  CHARACTER_ABILITY_ALREADY,
  CHARACTER_ABILITY_ENTRY_NOT_FOUND,
  CHARACTER_ABILITY_NOT_FOUND,
  CHARACTER_ABILITY_NOT_PREPARABLE,
} from './character-abilities.messages.js';
import {
  AddCharacterAbilityDto,
  UpdateCharacterAbilityDto,
} from './dto/character-ability.dto.js';

// Способности у персонажа (docs/plan/character-abilities.md). Меняет только автор
// персонажа, отдельно от формы: каждая правка отдаёт список целиком.
@Injectable()
export class CharacterAbilitiesService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(CharacterAbilitiesService.name)
    private readonly logger: PinoLogger,
  ) {}

  add(userId: string, characterId: string, dto: AddCharacterAbilityDto) {
    return this.change('add', { userId, characterId, ...dto }, async (tx) => {
      // Добавить можно только то, что видишь сам: чужая скрытая неотличима от
      // несуществующей. 400, а не 404: не найдена способность из тела, а не адрес.
      const [ability] = await tx
        .select({ id: abilities.id })
        .from(abilities)
        .where(visibleEntry(ABILITY_ACCESS, userId, dto.abilityId))
        .limit(1);
      if (!ability) throw new BadRequestException(CHARACTER_ABILITY_NOT_FOUND);
      // Повтор упирается в уникальность и не вставляет строку — и при двух быстрых
      // кликах тоже.
      const inserted = await tx
        .insert(characterAbilities)
        .values({ characterId, abilityId: ability.id })
        .onConflictDoNothing()
        .returning({ id: characterAbilities.id });
      if (inserted.length === 0) {
        throw new ConflictException(CHARACTER_ABILITY_ALREADY);
      }
    });
  }

  // Снять отметку можно всегда, поставить — только у видимого автору персонажа
  // заклинания 1 круга и выше.
  update(
    userId: string,
    characterId: string,
    entryId: string,
    dto: UpdateCharacterAbilityDto,
  ) {
    const log = { userId, characterId, entryId, ...dto };
    return this.change('update', log, async (tx) => {
      const [row] = await tx
        .select({ ability: abilities })
        .from(characterAbilities)
        .leftJoin(abilities, eq(abilities.id, characterAbilities.abilityId))
        .where(this.entryOf(characterId, entryId))
        .limit(1);
      if (!row) throw new NotFoundException(CHARACTER_ABILITY_ENTRY_NOT_FOUND);
      const { ability } = row;
      if (dto.prepared) {
        const visible =
          ability && (ability.authorId === userId || ability.isPublic);
        const fields =
          visible &&
          toAbilityVariant(ability.category, ability.details, ability.extra);
        const card = fields && {
          category: fields.category,
          level: fields.category === 'spell' ? fields.details.level : null,
        };
        if (!card || !canBePrepared(card)) {
          throw new BadRequestException(CHARACTER_ABILITY_NOT_PREPARABLE);
        }
      }
      await tx
        .update(characterAbilities)
        .set({ prepared: dto.prepared })
        .where(this.entryOf(characterId, entryId));
    });
  }

  // Убрать можно любую строку, и скрытую, и удалённую автором.
  remove(userId: string, characterId: string, entryId: string) {
    const log = { userId, characterId, entryId };
    return this.change('remove', log, async (tx) => {
      const [row] = await tx
        .delete(characterAbilities)
        .where(this.entryOf(characterId, entryId))
        .returning({ id: characterAbilities.id });
      if (!row) throw new NotFoundException(CHARACTER_ABILITY_ENTRY_NOT_FOUND);
    });
  }

  private entryOf(characterId: string, entryId: string) {
    return and(
      eq(characterAbilities.id, entryId),
      eq(characterAbilities.characterId, characterId),
    );
  }

  // Правка в транзакции после проверки, что персонаж свой; ответ — список целиком.
  private async change(
    kind: 'add' | 'update' | 'remove',
    log: { userId: string; characterId: string } & Record<string, unknown>,
    apply: (tx: DbTransaction) => Promise<void>,
  ): Promise<CharacterAbilityEntry[]> {
    const t0 = Date.now();
    const { userId, characterId } = log;
    try {
      await this.databaseService.db.transaction(async (tx) => {
        await assertOwnedCharacter(tx, userId, characterId, {
          forUpdate: false,
        });
        await apply(tx);
      });
      const list = await loadCharacterAbilities(
        this.databaseService.db,
        userId,
        characterId,
      );
      this.logger.info(
        { ...log, kind, count: list.length, durationMs: Date.now() - t0 },
        'Character abilities changed',
      );
      return list;
    } catch (err: unknown) {
      // 400, 404 и 409 — ответ клиенту, а не сбой.
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, ...log, kind, durationMs: Date.now() - t0 },
        'Character abilities change failed',
      );
      throw err;
    }
  }
}
