import type { GameUser } from './games.js';

// Журнал игры (docs/plan/game.md, «Журнал игры»): каждое действие в игре — запись с
// номером по порядку внутри игры. Записи только добавляются; отмена — тоже запись.
// Сам журнал видит только мастер.

// Сколько записей отдаёт одна страница журнала, если не просили меньше.
export const GAME_EVENTS_PAGE = 50;
export const GAME_EVENTS_PAGE_MAX = 100;

// Персонаж, как он звался в момент события: журнал читается и после его удаления.
export interface GameEventCharacter {
  id: string;
  name: string;
}

// От имени кого сделано. Нет записи — человек действовал сам за себя (вошёл в лобби,
// занял место). Персонажи и монстры появятся с фигурками на сцене.
export type GameEventAs =
  | { kind: 'master' }
  | { kind: 'character'; id: string }
  | { kind: 'monster'; id: string };

// Почему освободилось место: игрок освободил сам или удалил персонажа.
export type SeatFreedReason = 'freed' | 'character_deleted';

// Что просили (intent) и что получилось (result) — для каждого вида события. Пароль
// игры в журнал не попадает никогда, только то, что он есть.
export interface GameEventPayloads {
  'game.created': {
    intent: { name: string; seatCount: number; hasPassword: boolean };
    result: null;
  };
  'member.entered': { intent: null; result: null };
  'seat.taken': {
    intent: { characterId: string; allowHandover: boolean };
    result: { character: GameEventCharacter };
  };
  'seat.updated': {
    intent: { allowHandover: boolean };
    result: { character: GameEventCharacter };
  };
  'seat.freed': {
    intent: null;
    result: { character: GameEventCharacter; reason: SeatFreedReason };
  };
  // Игрок вышел сам; место, если было, ушло вместе с ним.
  'member.left': {
    intent: null;
    result: { character: GameEventCharacter | null };
  };
  // Мастер убрал игрока.
  'member.removed': {
    intent: { userId: string };
    result: { member: GameUser; character: GameEventCharacter | null };
  };
}

export type GameEventKind = keyof GameEventPayloads;

interface GameEventBase {
  seq: number;
  // Кто сделал; null — его аккаунт удалён.
  actor: GameUser | null;
  as: GameEventAs | null;
  // Сцена, в которой это случилось; у событий лобби — null.
  sceneId: string | null;
  createdAt: string;
}

export type GameEvent = {
  [K in GameEventKind]: GameEventBase & { kind: K } & GameEventPayloads[K];
}[GameEventKind];

// Страница журнала: новые сверху. hasMore — есть записи старше последней в странице.
export interface GameEventPage {
  events: GameEvent[];
  hasMore: boolean;
}
