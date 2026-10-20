import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { loadMainImages } from '../character-images/character-image-access.js';
import { DatabaseService } from '../database/database.service.js';
import { characters, users } from '../database/schema/index.js';
import { releaseCharacterSeat } from '../games/release-character-seat.js';
import {
  loadCharacterAbilities,
  loadCharacterAbilityLists,
} from './abilities/index.js';
import { nicknameOf } from './character-author.js';
import { spentSpellSlots } from './character-spell-slots.js';
import { characterVisibleTo } from './character-visibility.js';
import {
  loadCharacterEffectLists,
  loadCharacterEffects,
} from './effects/index.js';
import { loadInventories, loadInventory } from './inventory/index.js';
import {
  toCharacter,
  toInsertValues,
  toSheetValues,
} from './characters.mapper.js';
import { CreateCharacterDto } from './dto/create-character.dto.js';
import { UpdateCharacterDto } from './dto/update-character.dto.js';

@Injectable()
export class CharactersService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(CharactersService.name)
    private readonly logger: PinoLogger,
  ) {}

  async create(userId: string, dto: CreateCharacterDto) {
    const t0 = Date.now();
    try {
      const [row] = await this.databaseService.db
        .insert(characters)
        .values(toInsertValues(userId, dto))
        .returning();
      this.logger.info(
        { durationMs: Date.now() - t0, userId, characterId: row.id },
        'Character created',
      );
      return toCharacter(row, {
        mainImage: null,
        authorNickname: await nicknameOf(this.databaseService.db, userId),
        inventory: [],
        effects: [],
        abilities: [],
      });
    } catch (err: unknown) {
      this.logger.error(
        { err, durationMs: Date.now() - t0, userId },
        'Character creation failed',
      );
      throw err;
    }
  }

  async findAllForUser(userId: string) {
    const t0 = Date.now();
    try {
      const rows = await this.databaseService.db
        .select({ row: characters, authorNickname: users.nickname })
        .from(characters)
        .innerJoin(users, eq(users.id, characters.userId))
        .where(eq(characters.userId, userId))
        // createdAt — тай-брейкер для записей с одинаковым updatedAt (например,
        // проставленным миграцией), чтобы порядок не прыгал между запросами.
        .orderBy(desc(characters.updatedAt), desc(characters.createdAt));
      const ids = rows.map(({ row }) => row.id);
      const mainImages = await loadMainImages(this.databaseService.db, ids);
      const inventories = await loadInventories(
        this.databaseService.db,
        userId,
        ids,
      );
      const effectLists = await loadCharacterEffectLists(
        this.databaseService.db,
        userId,
        ids,
      );
      const abilityLists = await loadCharacterAbilityLists(
        this.databaseService.db,
        userId,
        ids,
      );
      this.logger.debug(
        { durationMs: Date.now() - t0, userId, count: rows.length },
        'Characters listed',
      );
      return rows.map(({ row, authorNickname }) =>
        toCharacter(row, {
          mainImage: mainImages.get(row.id) ?? null,
          authorNickname,
          inventory: inventories.get(row.id) ?? [],
          effects: effectLists.get(row.id) ?? [],
          abilities: abilityLists.get(row.id) ?? [],
        }),
      );
    } catch (err: unknown) {
      this.logger.error(
        { err, durationMs: Date.now() - t0, userId },
        'Character listing failed',
      );
      throw err;
    }
  }

  // Автору — всегда, остальным — если открыт доступ по ссылке. Закрытый чужой персонаж
  // неотличим от несуществующего.
  async findOneVisible(userId: string, id: string) {
    const t0 = Date.now();
    try {
      const [found] = await this.databaseService.db
        .select({ row: characters, authorNickname: users.nickname })
        .from(characters)
        .innerJoin(users, eq(users.id, characters.userId))
        .where(and(eq(characters.id, id), characterVisibleTo(userId)))
        .limit(1);
      this.logger.debug(
        {
          durationMs: Date.now() - t0,
          userId,
          characterId: id,
          found: Boolean(found),
          own: found ? found.row.userId === userId : undefined,
        },
        'Character lookup',
      );
      if (!found) {
        throw new NotFoundException('Персонаж не найден');
      }
      return toCharacter(found.row, {
        mainImage: await this.mainImageOf(id),
        authorNickname: found.authorNickname,
        // Глазами смотрящего: чужие скрытые от него предметы — строки без карточки.
        inventory: await loadInventory(this.databaseService.db, userId, id),
        effects: await loadCharacterEffects(
          this.databaseService.db,
          userId,
          id,
        ),
        abilities: await loadCharacterAbilities(
          this.databaseService.db,
          userId,
          id,
        ),
      });
    } catch (err: unknown) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      this.logger.error(
        { err, durationMs: Date.now() - t0, userId, characterId: id },
        'Character lookup failed',
      );
      throw err;
    }
  }

  async update(userId: string, id: string, dto: UpdateCharacterDto) {
    // Пустой PATCH ({}) — валидный запрос по DTO (все поля @IsOptional()), но
    // drizzle's .set({}) синхронно бросает "No values to set". Раз обновлять
    // нечего, просто отдаём текущую запись (заодно проверяя владение/существование).
    // Смотрим на значения, а не на ключи: у экземпляра DTO неприсланные поля — свои
    // ключи со значением undefined.
    if (Object.values(dto).every((value) => value === undefined)) {
      return this.findOwn(userId, id);
    }
    const { spellSlotsExpended, ...values } = dto;
    return this.applyUpdate(
      userId,
      id,
      values,
      'patch',
      spellSlotsExpended &&
        ((row) => ({
          spellSlots: spentSpellSlots(row.spellSlots, spellSlotsExpended),
        })),
    );
  }

  // Полное редактирование чарника формой: тот же DTO, что и при создании.
  // Перезаписываются только присланные поля (см. toSheetValues).
  replace(userId: string, id: string, dto: CreateCharacterDto) {
    return this.applyUpdate(userId, id, toSheetValues(dto), 'replace');
  }

  private async applyUpdate(
    userId: string,
    id: string,
    values: Partial<typeof characters.$inferInsert>,
    kind: 'patch' | 'replace',
    // Значения, которые зависят от текущей строки (потраченные ячейки): строка читается
    // под блокировкой в той же транзакции, что и запись.
    fromCurrent?: (
      row: typeof characters.$inferSelect,
    ) => Partial<typeof characters.$inferInsert>,
  ) {
    const t0 = Date.now();
    const own = and(eq(characters.id, id), eq(characters.userId, userId));
    try {
      const row = await this.databaseService.db.transaction(async (tx) => {
        let set = values;
        if (fromCurrent) {
          const [current] = await tx
            .select()
            .from(characters)
            .where(own)
            .for('update');
          if (!current) return undefined;
          set = { ...values, ...fromCurrent(current) };
        }
        const [updated] = await tx
          .update(characters)
          .set(set)
          .where(own)
          .returning();
        return updated;
      });
      if (!row) {
        throw new NotFoundException('Персонаж не найден');
      }
      this.logger.info(
        { durationMs: Date.now() - t0, userId, characterId: id, kind },
        'Character updated',
      );
      return toCharacter(row, {
        mainImage: await this.mainImageOf(id),
        authorNickname: await nicknameOf(this.databaseService.db, userId),
        inventory: await loadInventory(this.databaseService.db, userId, id),
        effects: await loadCharacterEffects(
          this.databaseService.db,
          userId,
          id,
        ),
        abilities: await loadCharacterAbilities(
          this.databaseService.db,
          userId,
          id,
        ),
      });
    } catch (err: unknown) {
      // 404 и 400 (ячеек меньше, чем потрачено) — ответ клиенту, а не сбой.
      if (err instanceof HttpException) {
        throw err;
      }
      this.logger.error(
        { err, durationMs: Date.now() - t0, userId, characterId: id, kind },
        'Character update failed',
      );
      throw err;
    }
  }

  // Свой персонаж: пустой PATCH не должен отдавать чужого, даже открытого по ссылке.
  private async findOwn(userId: string, id: string) {
    const character = await this.findOneVisible(userId, id);
    if (character.userId !== userId) {
      throw new NotFoundException('Персонаж не найден');
    }
    return character;
  }

  private async mainImageOf(characterId: string) {
    const mainImages = await loadMainImages(this.databaseService.db, [
      characterId,
    ]);
    return mainImages.get(characterId) ?? null;
  }

  async remove(userId: string, id: string) {
    const t0 = Date.now();
    try {
      await this.databaseService.db.transaction(async (tx) => {
        // Персонаж на месте в игре: место освобождается записью в журнале игры. Чужой
        // персонаж дальше даст 404, и транзакция откатит и это.
        await releaseCharacterSeat(tx, id, userId);
        const [row] = await tx
          .delete(characters)
          .where(and(eq(characters.id, id), eq(characters.userId, userId)))
          .returning({ id: characters.id });
        if (!row) {
          throw new NotFoundException('Персонаж не найден');
        }
      });
      this.logger.info(
        { durationMs: Date.now() - t0, userId, characterId: id },
        'Character deleted',
      );
    } catch (err: unknown) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      this.logger.error(
        { err, durationMs: Date.now() - t0, userId, characterId: id },
        'Character deletion failed',
      );
      throw err;
    }
  }
}
