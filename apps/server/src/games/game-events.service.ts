import { ForbiddenException, HttpException, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { GAME_EVENTS_PAGE, type GameEventPage } from 'shared';
import { DatabaseService } from '../database/database.service.js';
import type { ListGameEventsDto } from './dto/list-game-events.dto.js';
import { MASTER_ONLY_JOURNAL } from './game-errors.js';
import { readGameEvents } from './game-event-read.js';
import { findGameAccess } from './game-read.js';

// Чтение журнала игры. Журнал видит только мастер: позже в нём будут скрытые от игроков
// монстры и броски мастера.
@Injectable()
export class GameEventsService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(GameEventsService.name)
    private readonly logger: PinoLogger,
  ) {}

  async list(
    viewerId: string,
    gameId: string,
    query: ListGameEventsDto,
  ): Promise<GameEventPage> {
    const t0 = Date.now();
    const { db } = this.databaseService;
    try {
      const { game } = await findGameAccess(db, gameId, viewerId);
      if (game.masterId !== viewerId) {
        throw new ForbiddenException(MASTER_ONLY_JOURNAL);
      }
      const limit = query.limit ?? GAME_EVENTS_PAGE;
      // На одну запись больше: по ней видно, есть ли страница дальше.
      const rows = await readGameEvents(
        db,
        gameId,
        { before: query.before },
        limit + 1,
      );
      const events = rows.slice(0, limit);
      this.logger.debug(
        { durationMs: Date.now() - t0, viewerId, gameId, count: events.length },
        'Game events listed',
      );
      return { events, hasMore: rows.length > limit };
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, viewerId, gameId },
        'Game events listing failed',
      );
      throw err;
    }
  }
}
