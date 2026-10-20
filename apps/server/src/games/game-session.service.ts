import {
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { GameDetail } from 'shared';
import { DatabaseService } from '../database/database.service.js';
import { games } from '../database/schema/index.js';
import {
  MASTER_ONLY_SESSION,
  SESSION_ALREADY_STARTED,
  SESSION_NOT_STARTED,
} from './game-errors.js';
import { appendGameEvent, lockGame } from './game-journal.js';
import { findGameAccess, readGameDetail } from './game-read.js';
import { GameRealtimeService } from './realtime/game-realtime.service.js';

// Встреча: мастер начинает и заканчивает её кнопками (docs/plan/game.md, «Понятия»).
// Пока она идёт, листы персонажей на местах закрыты (sheet-lock.ts).
@Injectable()
export class GameSessionService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly realtime: GameRealtimeService,
    @InjectPinoLogger(GameSessionService.name)
    private readonly logger: PinoLogger,
  ) {}

  start(userId: string, gameId: string): Promise<GameDetail> {
    return this.change(userId, gameId, 'start');
  }

  end(userId: string, gameId: string): Promise<GameDetail> {
    return this.change(userId, gameId, 'end');
  }

  private async change(
    userId: string,
    gameId: string,
    kind: 'start' | 'end',
  ): Promise<GameDetail> {
    const t0 = Date.now();
    const { db } = this.databaseService;
    try {
      const { game } = await findGameAccess(db, gameId, userId);
      if (game.masterId !== userId) {
        throw new ForbiddenException(MASTER_ONLY_SESSION);
      }
      await db.transaction(async (tx) => {
        await lockGame(tx, gameId);
        // Под блокировкой: двойной клик или две вкладки мастера не начнут встречу дважды.
        const [{ startedAt }] = await tx
          .select({ startedAt: games.sessionStartedAt })
          .from(games)
          .where(eq(games.id, gameId));
        if (kind === 'start') {
          if (startedAt) throw new ConflictException(SESSION_ALREADY_STARTED);
          await tx
            .update(games)
            .set({ sessionStartedAt: new Date() })
            .where(eq(games.id, gameId));
          await appendGameEvent(tx, gameId, {
            kind: 'session.started',
            actorId: userId,
            as: { kind: 'master' },
            intent: null,
            result: null,
          });
        } else {
          if (!startedAt) throw new ConflictException(SESSION_NOT_STARTED);
          await tx
            .update(games)
            .set({ sessionStartedAt: null })
            .where(eq(games.id, gameId));
          await appendGameEvent(tx, gameId, {
            kind: 'session.ended',
            actorId: userId,
            as: { kind: 'master' },
            intent: null,
            result: { startedAt: startedAt.toISOString() },
          });
        }
      });
      this.realtime.publish(gameId);
      this.logger.info(
        { durationMs: Date.now() - t0, userId, gameId, kind },
        'Game session changed',
      );
      return readGameDetail(db, gameId, userId);
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, userId, gameId, kind },
        'Changing a game session failed',
      );
      throw err;
    }
  }
}
