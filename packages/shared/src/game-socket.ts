import type { GameEvent, GameEventKind } from './game-events.js';

// Сокет игры (docs/plan/game.md, этап 3): живые изменения лобби и присутствие. Входит
// по cookie сессии, как и REST; путь — под /api, чтобы прокси и прод вели его туда же.
export const GAME_SOCKET_PATH = '/api/socket.io';

// Названия сообщений в обе стороны.
export const GAME_SOCKET = {
  // клиент → сервер, с ответом (ack)
  join: 'game:join',
  leave: 'game:leave',
  // сервер → клиент
  changed: 'game:changed',
  event: 'game:event',
  presence: 'game:presence',
  closed: 'game:closed',
} as const;

// Сколько пропущенных записей журнала мастер получает при возвращении; больше —
// журнал перечитывается целиком.
export const GAME_SOCKET_MISSED_MAX = 100;

export interface GameJoinRequest {
  gameId: string;
  // Последний номер журнала, который клиент уже видел (после переподключения).
  afterSeq?: number;
}

export type GameJoinAck =
  | {
      ok: true;
      // Номер последней записи журнала на момент входа.
      seq: number;
      // Кто сейчас в лобби: id пользователей, мастер тоже.
      online: string[];
      // Только мастеру и только с afterSeq: записи после него по порядку; null — их
      // больше GAME_SOCKET_MISSED_MAX или это не мастер.
      missed: GameEvent[] | null;
    }
  | { ok: false; error: string };

// Всем в комнате: в игре что-то изменилось — лобби перечитывает себя. Сама запись идёт
// только мастеру (журнал видит только он).
export interface GameChangedMessage {
  gameId: string;
  seq: number;
  kind: GameEventKind;
}

// Мастеру: новая запись журнала.
export interface GameEventMessage {
  gameId: string;
  event: GameEvent;
}

export interface GamePresenceMessage {
  gameId: string;
  online: string[];
}

// Комната закрыта для этого клиента: игру удалили или его убрали из закрытой игры.
export interface GameClosedMessage {
  gameId: string;
  reason: 'deleted' | 'removed';
}
