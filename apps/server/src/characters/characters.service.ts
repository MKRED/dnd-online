import { Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { DatabaseService } from '../database/database.service.js';
import { characters } from '../database/schema/index.js';
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
      return toCharacter(row);
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
        .select()
        .from(characters)
        .where(eq(characters.userId, userId))
        // createdAt — тай-брейкер для записей с одинаковым updatedAt (например,
        // проставленным миграцией), чтобы порядок не прыгал между запросами.
        .orderBy(desc(characters.updatedAt), desc(characters.createdAt));
      this.logger.debug(
        { durationMs: Date.now() - t0, userId, count: rows.length },
        'Characters listed',
      );
      return rows.map(toCharacter);
    } catch (err: unknown) {
      this.logger.error(
        { err, durationMs: Date.now() - t0, userId },
        'Character listing failed',
      );
      throw err;
    }
  }

  async findOneForUser(userId: string, id: string) {
    const t0 = Date.now();
    try {
      const [row] = await this.databaseService.db
        .select()
        .from(characters)
        .where(and(eq(characters.id, id), eq(characters.userId, userId)))
        .limit(1);
      this.logger.debug(
        {
          durationMs: Date.now() - t0,
          userId,
          characterId: id,
          found: Boolean(row),
        },
        'Character lookup',
      );
      if (!row) {
        throw new NotFoundException('Персонаж не найден');
      }
      return toCharacter(row);
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
    if (Object.keys(dto).length === 0) {
      return this.findOneForUser(userId, id);
    }
    return this.applyUpdate(userId, id, dto, 'patch');
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
  ) {
    const t0 = Date.now();
    try {
      const [row] = await this.databaseService.db
        .update(characters)
        .set(values)
        .where(and(eq(characters.id, id), eq(characters.userId, userId)))
        .returning();
      if (!row) {
        throw new NotFoundException('Персонаж не найден');
      }
      this.logger.info(
        { durationMs: Date.now() - t0, userId, characterId: id, kind },
        'Character updated',
      );
      return toCharacter(row);
    } catch (err: unknown) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      this.logger.error(
        { err, durationMs: Date.now() - t0, userId, characterId: id, kind },
        'Character update failed',
      );
      throw err;
    }
  }

  async remove(userId: string, id: string) {
    const t0 = Date.now();
    try {
      const [row] = await this.databaseService.db
        .delete(characters)
        .where(and(eq(characters.id, id), eq(characters.userId, userId)))
        .returning({ id: characters.id });
      if (!row) {
        throw new NotFoundException('Персонаж не найден');
      }
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
