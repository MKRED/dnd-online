import {
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { GameDetail, GameListItem } from 'shared';
import { PASSWORD_SALT_ROUNDS } from '../auth/auth.service.js';
import { DatabaseService } from '../database/database.service.js';
import { games } from '../database/schema/index.js';
import type { CreateGameDto } from './dto/create-game.dto.js';
import { GAME_NOT_FOUND, MASTER_ONLY_DELETE } from './game-errors.js';
import { listGames, readGameDetail } from './game-read.js';

// Игры как записи: общий список, лобби, создание, удаление. Вход и выход —
// GameMembersService, места — GameSeatsService.
@Injectable()
export class GamesService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(GamesService.name) private readonly logger: PinoLogger,
  ) {}

  async list(viewerId: string): Promise<GameListItem[]> {
    const t0 = Date.now();
    try {
      const items = await listGames(this.databaseService.db, viewerId);
      this.logger.debug(
        { durationMs: Date.now() - t0, viewerId, count: items.length },
        'Games listed',
      );
      return items;
    } catch (err: unknown) {
      this.logger.error({ err, viewerId }, 'Game listing failed');
      throw err;
    }
  }

  async findOne(viewerId: string, gameId: string): Promise<GameDetail> {
    const t0 = Date.now();
    try {
      const detail = await readGameDetail(
        this.databaseService.db,
        gameId,
        viewerId,
      );
      this.logger.debug(
        { durationMs: Date.now() - t0, viewerId, gameId },
        'Game read',
      );
      return detail;
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error({ err, viewerId, gameId }, 'Game read failed');
      throw err;
    }
  }

  async create(masterId: string, dto: CreateGameDto): Promise<GameDetail> {
    const t0 = Date.now();
    try {
      const passwordHash = dto.password
        ? await bcrypt.hash(dto.password, PASSWORD_SALT_ROUNDS)
        : null;
      const [row] = await this.databaseService.db
        .insert(games)
        .values({
          masterId,
          name: dto.name,
          seatCount: dto.seatCount,
          passwordHash,
        })
        .returning({ id: games.id });
      this.logger.info(
        {
          durationMs: Date.now() - t0,
          masterId,
          gameId: row.id,
          seatCount: dto.seatCount,
          locked: passwordHash !== null,
        },
        'Game created',
      );
      return readGameDetail(this.databaseService.db, row.id, masterId);
    } catch (err: unknown) {
      this.logger.error({ err, masterId }, 'Game creation failed');
      throw err;
    }
  }

  // Участники и места уходят каскадом; персонажи свободны для других игр.
  async remove(userId: string, gameId: string): Promise<void> {
    const t0 = Date.now();
    try {
      const [game] = await this.databaseService.db
        .select({ masterId: games.masterId })
        .from(games)
        .where(eq(games.id, gameId))
        .limit(1);
      if (!game) throw new NotFoundException(GAME_NOT_FOUND);
      if (game.masterId !== userId) {
        throw new ForbiddenException(MASTER_ONLY_DELETE);
      }
      await this.databaseService.db.delete(games).where(eq(games.id, gameId));
      this.logger.info(
        { durationMs: Date.now() - t0, userId, gameId },
        'Game deleted',
      );
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error({ err, userId, gameId }, 'Game deletion failed');
      throw err;
    }
  }
}
