import { Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { DatabaseService } from '../database/database.service';
import { characters } from '../database/schema';
import { toCharacter, toInsertValues } from './characters.mapper';
import { CreateCharacterDto } from './dto/create-character.dto';
import { UpdateCharacterDto } from './dto/update-character.dto';

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
        .where(eq(characters.userId, userId));
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
        throw new NotFoundException('Character not found');
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

    const t0 = Date.now();
    try {
      const [row] = await this.databaseService.db
        .update(characters)
        .set(dto)
        .where(and(eq(characters.id, id), eq(characters.userId, userId)))
        .returning();
      if (!row) {
        throw new NotFoundException('Character not found');
      }
      this.logger.info(
        { durationMs: Date.now() - t0, userId, characterId: id },
        'Character updated',
      );
      return toCharacter(row);
    } catch (err: unknown) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      this.logger.error(
        { err, durationMs: Date.now() - t0, userId, characterId: id },
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
        throw new NotFoundException('Character not found');
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
