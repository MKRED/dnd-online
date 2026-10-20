import { ForbiddenException, HttpException, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { GameFigures, Vec3 } from 'shared';
import {
  DatabaseService,
  type DbTransaction,
} from '../../database/database.service.js';
import { games } from '../../database/schema/index.js';
import { SCENE_CLOSED, SCENE_MEMBERS_ONLY } from '../game-errors.js';
import { lockGame } from '../game-journal.js';
import { findGameAccess } from '../game-read.js';
import { GameRealtimeService } from '../realtime/game-realtime.service.js';
import {
  changeAllowance,
  moveFigure,
  newRound,
  placeFigure,
  type FigureActor,
} from './figure-moves.js';
import { GameFiguresReadService } from './game-figures-read.service.js';

type FigureChange = 'move' | 'place' | 'round' | 'refresh' | 'dash';

async function sceneOpen(tx: DbTransaction, gameId: string): Promise<boolean> {
  const [game] = await tx
    .select({ open: games.sceneOpen })
    .from(games)
    .where(eq(games.id, gameId));
  return game?.open ?? false;
}

// Правки фигурок (docs/plan/game.md, этап 7): ход игрока, постановка, «Новый раунд»,
// запас одной фигурки. Каждая — одна транзакция под блокировкой игры, событие журнала и
// рассылка; ответ — фигурки глазами того, кто правил.
@Injectable()
export class GameFiguresService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly readService: GameFiguresReadService,
    private readonly realtime: GameRealtimeService,
    @InjectPinoLogger(GameFiguresService.name)
    private readonly logger: PinoLogger,
  ) {}

  move(userId: string, gameId: string, characterId: string, to: Vec3) {
    return this.change(userId, gameId, 'move', (actor) =>
      moveFigure(actor, characterId, to),
    );
  }

  place(userId: string, gameId: string, characterId: string, at: Vec3) {
    return this.change(userId, gameId, 'place', (actor) =>
      placeFigure(actor, characterId, at),
    );
  }

  round(userId: string, gameId: string) {
    return this.change(userId, gameId, 'round', newRound);
  }

  allowance(
    userId: string,
    gameId: string,
    characterId: string,
    change: 'refresh' | 'dash',
  ) {
    return this.change(userId, gameId, change, (actor) =>
      changeAllowance(actor, characterId, change),
    );
  }

  private async change(
    userId: string,
    gameId: string,
    kind: FigureChange,
    run: (actor: FigureActor) => Promise<void>,
  ): Promise<GameFigures> {
    const t0 = Date.now();
    const { db } = this.databaseService;
    try {
      const { game, member } = await findGameAccess(db, gameId, userId);
      const master = game.masterId === userId;
      if (!master && !member) throw new ForbiddenException(SCENE_MEMBERS_ONLY);
      await db.transaction(async (tx) => {
        await lockGame(tx, gameId);
        // Закрытая сцена игрокам не видна — и ходить по ней нельзя.
        if (!master && !(await sceneOpen(tx, gameId))) {
          throw new ForbiddenException(SCENE_CLOSED);
        }
        await run({ tx, gameId, userId, masterId: game.masterId });
      });
      this.realtime.publish(gameId);
      this.logger.info(
        { durationMs: Date.now() - t0, userId, gameId, kind },
        'Game figure changed',
      );
      return this.readService.list(userId, gameId);
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, userId, gameId, kind },
        'Changing a game figure failed',
      );
      throw err;
    }
  }
}
