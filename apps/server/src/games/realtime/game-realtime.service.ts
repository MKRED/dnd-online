import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  GAME_SOCKET,
  type GameChangedMessage,
  type GameClosedMessage,
  type GameEvent,
  type GameEventMessage,
  type GamePresenceMessage,
} from 'shared';
import { DatabaseService } from '../../database/database.service.js';
import { games } from '../../database/schema/index.js';
import { readGameEvents } from '../game-event-read.js';
import { findGameAccess } from '../game-read.js';
import { GamePresence } from './game-presence.js';
import {
  gameRoom,
  type GameRemoteSocket,
  type GameServer,
} from './game-socket.types.js';

// За раз из журнала в сокет; больше — придёт следующей порцией той же рассылки.
const PUBLISH_BATCH = 200;

// Рассылка изменений игры по сокету (docs/plan/game.md, этап 3). Сервисы игр зовут
// publish после своей транзакции; рассылка сама читает из журнала всё, что новее
// последнего отправленного номера, — живая рассылка и догонка идут одним путём, и
// пропущенный вызов publish не теряет запись: она уйдёт со следующей.
@Injectable()
export class GameRealtimeService {
  private server?: GameServer;
  readonly presence = new GamePresence();
  // игра → номер последней разосланной записи; только для игр с открытой комнатой
  private readonly lastSent = new Map<string, number>();
  // Рассылки одной игры идут по очереди: две одновременные разослали бы записи дважды.
  private readonly queues = new Map<string, Promise<void>>();

  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(GameRealtimeService.name)
    private readonly logger: PinoLogger,
  ) {}

  attach(server: GameServer): void {
    this.server = server;
  }

  // Первый в комнате задаёт точку отсчёта: раньше этого номера в комнате никого не было.
  roomOpened(gameId: string, seq: number): void {
    if (!this.lastSent.has(gameId)) this.lastSent.set(gameId, seq);
  }

  publish(gameId: string): void {
    const previous = this.queues.get(gameId) ?? Promise.resolve();
    const next = previous
      .then(() => this.flush(gameId))
      .catch((err: unknown) => {
        this.logger.error({ err, gameId }, 'Game publish failed');
      });
    this.queues.set(gameId, next);
    void next.finally(() => {
      if (this.queues.get(gameId) === next) this.queues.delete(gameId);
    });
  }

  // Игру удалили: всем в комнате — «закрыто», комната расходится.
  gameDeleted(gameId: string): void {
    const server = this.server;
    if (!server) return;
    const message: GameClosedMessage = { gameId, reason: 'deleted' };
    server.to(gameRoom(gameId)).emit(GAME_SOCKET.closed, message);
    server.in(gameRoom(gameId)).socketsLeave(gameRoom(gameId));
    this.lastSent.delete(gameId);
    this.presence.forget(gameId);
    this.logger.info({ gameId }, 'Game room closed');
  }

  broadcastPresence(gameId: string): void {
    const message: GamePresenceMessage = {
      gameId,
      online: this.presence.online(gameId),
    };
    this.server?.to(gameRoom(gameId)).emit(GAME_SOCKET.presence, message);
  }

  private async flush(gameId: string): Promise<void> {
    const server = this.server;
    const after = this.lastSent.get(gameId);
    // Комнату никто не открывал — рассылать некому.
    if (!server || after === undefined) return;
    const t0 = Date.now();
    const sockets = await server.in(gameRoom(gameId)).fetchSockets();
    if (sockets.length === 0) {
      this.lastSent.delete(gameId);
      return;
    }
    const { db } = this.databaseService;
    const [game] = await db
      .select({ masterId: games.masterId })
      .from(games)
      .where(eq(games.id, gameId));
    if (!game) return;
    const events = await readGameEvents(db, gameId, { after }, PUBLISH_BATCH);
    if (events.length === 0) return;
    for (const event of events) {
      const changed: GameChangedMessage = {
        gameId,
        seq: event.seq,
        kind: event.kind,
      };
      server.to(gameRoom(gameId)).emit(GAME_SOCKET.changed, changed);
      const full: GameEventMessage = { gameId, event };
      for (const socket of sockets) {
        if (socket.data.userId === game.masterId) {
          socket.emit(GAME_SOCKET.event, full);
        }
      }
    }
    this.lastSent.set(gameId, events[events.length - 1].seq);
    await this.evictLostAccess(gameId, sockets, events);
    this.logger.debug(
      {
        durationMs: Date.now() - t0,
        gameId,
        count: events.length,
        sockets: sockets.length,
      },
      'Game events published',
    );
    // Порция была полной — за ней могут быть ещё записи.
    if (events.length === PUBLISH_BATCH) await this.flush(gameId);
  }

  // Ушёл или убран из закрытой игры — комната для него закрывается, иначе он и дальше
  // получал бы изменения игры, в лобби которой его больше не пускают.
  private async evictLostAccess(
    gameId: string,
    sockets: GameRemoteSocket[],
    events: GameEvent[],
  ): Promise<void> {
    const gone = new Set<string>();
    for (const event of events) {
      if (event.kind === 'member.removed') gone.add(event.intent.userId);
      if (event.kind === 'member.left' && event.actor) {
        gone.add(event.actor.id);
      }
    }
    for (const userId of gone) {
      const { canView } = await findGameAccess(
        this.databaseService.db,
        gameId,
        userId,
      );
      if (canView) continue;
      const message: GameClosedMessage = { gameId, reason: 'removed' };
      for (const socket of sockets) {
        if (socket.data.userId !== userId) continue;
        socket.emit(GAME_SOCKET.closed, message);
        socket.leave(gameRoom(gameId));
        socket.data.games.delete(gameId);
        this.presence.remove(gameId, userId, socket.id);
      }
      this.logger.info({ gameId, userId }, 'Game room closed for a member');
      this.broadcastPresence(gameId);
    }
  }
}
