import type {
  GameChangedMessage,
  GameClosedMessage,
  GameEventMessage,
  GamePresenceMessage,
  GameSceneEditMessage,
} from 'shared';
import type { RemoteSocket, Server, Socket } from 'socket.io';

// Типы сокета игры для Socket.IO: что сервер шлёт клиенту и что хранит у сокета.
// Сообщения клиента принимает шлюз через @SubscribeMessage — их здесь нет.
export interface GameServerEvents {
  'game:changed': (message: GameChangedMessage) => void;
  'game:event': (message: GameEventMessage) => void;
  'game:presence': (message: GamePresenceMessage) => void;
  'game:closed': (message: GameClosedMessage) => void;
  'game:scene-edit': (message: GameSceneEditMessage) => void;
}

export interface GameSocketData {
  userId: string;
  // Комнаты игр, в которых сокет: при отключении socket.rooms уже пуст.
  games: Set<string>;
}

type NoEvents = Record<string, never>;

export type GameServer = Server<
  NoEvents,
  GameServerEvents,
  NoEvents,
  GameSocketData
>;
export type GameSocket = Socket<
  NoEvents,
  GameServerEvents,
  NoEvents,
  GameSocketData
>;
export type GameRemoteSocket = RemoteSocket<GameServerEvents, GameSocketData>;

export const gameRoom = (gameId: string) => `game:${gameId}`;
