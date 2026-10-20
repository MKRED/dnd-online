import { HttpException } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayDisconnect,
  type OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  GAME_SOCKET,
  GAME_SOCKET_MISSED_MAX,
  GAME_SOCKET_PATH,
  type GameEvent,
  type GameJoinAck,
  type GameJoinRequest,
} from 'shared';
import { TokenService } from '../../auth/token.service.js';
import { DatabaseService } from '../../database/database.service.js';
import { GAME_LOCKED, GAME_NOT_FOUND } from '../game-errors.js';
import { readGameEvents } from '../game-event-read.js';
import { findGameAccess } from '../game-read.js';
import { GameRealtimeService } from './game-realtime.service.js';
import {
  gameRoom,
  type GameServer,
  type GameSocket,
} from './game-socket.types.js';
import { readCookie } from './socket-cookie.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Сокет игры: вход по cookie сессии (как REST, без API-токенов — играют люди), комната
// на игру, присутствие. Изменения рассылает GameRealtimeService после транзакций.
@WebSocketGateway({ path: GAME_SOCKET_PATH })
export class GameRealtimeGateway implements OnGatewayInit, OnGatewayDisconnect {
  constructor(
    private readonly tokenService: TokenService,
    private readonly databaseService: DatabaseService,
    private readonly realtime: GameRealtimeService,
    @InjectPinoLogger(GameRealtimeGateway.name)
    private readonly logger: PinoLogger,
  ) {}

  afterInit(server: GameServer): void {
    this.realtime.attach(server);
    // Без сессии сокет не открывается. Истёкший access-токен клиент обновляет через
    // /auth/refresh и подключается снова — сообщение 'unauthorized' ему для этого.
    server.use((socket, next) => {
      const token = readCookie(
        socket.handshake.headers.cookie,
        TokenService.ACCESS_COOKIE,
      );
      if (!token) {
        next(new Error('unauthorized'));
        return;
      }
      this.tokenService.verifyAccessToken(token).then(
        (payload) => {
          socket.data.userId = payload.sub;
          socket.data.games = new Set();
          next();
        },
        (err: unknown) => {
          this.logger.debug({ err }, 'Game socket token rejected');
          next(new Error('unauthorized'));
        },
      );
    });
  }

  // Войти в комнату игры: тот же доступ, что у лобби (GET /games/:id). Повторный вход
  // после переподключения передаёт afterSeq — мастер получает пропущенные записи.
  @SubscribeMessage(GAME_SOCKET.join)
  async join(
    @ConnectedSocket() socket: GameSocket,
    @MessageBody() body: GameJoinRequest | undefined,
  ): Promise<GameJoinAck> {
    const gameId = body?.gameId;
    if (typeof gameId !== 'string' || !UUID.test(gameId)) {
      return { ok: false, error: GAME_NOT_FOUND };
    }
    const { userId } = socket.data;
    const { db } = this.databaseService;
    try {
      const { game, canView } = await findGameAccess(db, gameId, userId);
      if (!canView) return { ok: false, error: GAME_LOCKED };
      await socket.join(gameRoom(gameId));
      socket.data.games.add(gameId);
      this.realtime.roomOpened(gameId, game.eventSeq);
      if (this.realtime.presence.add(gameId, userId, socket.id)) {
        this.realtime.broadcastPresence(gameId);
      }
      const afterSeq = body?.afterSeq;
      let missed: GameEvent[] | null = null;
      if (
        game.masterId === userId &&
        typeof afterSeq === 'number' &&
        afterSeq < game.eventSeq
      ) {
        const behind = game.eventSeq - afterSeq;
        missed =
          behind > GAME_SOCKET_MISSED_MAX
            ? null
            : await readGameEvents(
                db,
                gameId,
                { after: afterSeq },
                GAME_SOCKET_MISSED_MAX,
              );
      }
      this.logger.debug({ gameId, userId, afterSeq }, 'Game room joined');
      return {
        ok: true,
        seq: game.eventSeq,
        online: this.realtime.presence.online(gameId),
        missed,
      };
    } catch (err: unknown) {
      if (err instanceof HttpException) {
        return { ok: false, error: err.message };
      }
      this.logger.error({ err, gameId, userId }, 'Joining a game room failed');
      return { ok: false, error: 'Не удалось подключиться к игре' };
    }
  }

  @SubscribeMessage(GAME_SOCKET.leave)
  async leave(
    @ConnectedSocket() socket: GameSocket,
    @MessageBody() body: { gameId?: string } | undefined,
  ): Promise<void> {
    const gameId = body?.gameId;
    if (typeof gameId !== 'string' || !socket.data.games.has(gameId)) return;
    await socket.leave(gameRoom(gameId));
    this.forgetSocket(socket, gameId);
  }

  handleDisconnect(socket: GameSocket): void {
    // Сокет мог отвалиться ещё на входе — тогда данных нет.
    for (const gameId of socket.data.games ?? []) {
      this.forgetSocket(socket, gameId);
    }
  }

  private forgetSocket(socket: GameSocket, gameId: string): void {
    socket.data.games.delete(gameId);
    if (this.realtime.presence.remove(gameId, socket.data.userId, socket.id)) {
      this.realtime.broadcastPresence(gameId);
    }
  }
}
