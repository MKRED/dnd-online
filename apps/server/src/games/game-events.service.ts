import { ForbiddenException, HttpException, Injectable } from '@nestjs/common';
import { and, desc, eq, lt } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { GAME_EVENTS_PAGE, type GameEvent, type GameEventPage } from 'shared';
import { DatabaseService } from '../database/database.service.js';
import { gameEvents, users } from '../database/schema/index.js';
import type { ListGameEventsDto } from './dto/list-game-events.dto.js';
import { MASTER_ONLY_JOURNAL } from './game-errors.js';
import { findGameAccess } from './game-read.js';

type EventRow = typeof gameEvents.$inferSelect;

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
      const rows = await db
        .select({ event: gameEvents, nickname: users.nickname })
        .from(gameEvents)
        .leftJoin(users, eq(users.id, gameEvents.actorId))
        .where(
          and(
            eq(gameEvents.gameId, gameId),
            query.before === undefined
              ? undefined
              : lt(gameEvents.seq, query.before),
          ),
        )
        .orderBy(desc(gameEvents.seq))
        .limit(limit + 1);
      const events = rows
        .slice(0, limit)
        .map(({ event, nickname }) => toGameEvent(event, nickname));
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

function toGameEvent(row: EventRow, nickname: string | null): GameEvent {
  // intent и result — jsonb, их форму по kind задаёт запись (appendGameEvent).
  return {
    seq: row.seq,
    kind: row.kind,
    actor: row.actorId && nickname ? { id: row.actorId, nickname } : null,
    as: row.asKind
      ? row.asKind === 'master'
        ? { kind: 'master' }
        : { kind: row.asKind, id: row.asId ?? '' }
      : null,
    sceneId: row.sceneId,
    intent: row.intent,
    result: row.result,
    createdAt: row.createdAt.toISOString(),
  } as GameEvent;
}
