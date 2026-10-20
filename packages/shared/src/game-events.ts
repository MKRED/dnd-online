import type { GameUser } from './games.js';
import type { GameLibraryRef } from './game-library.js';
import type { GameSceneRef } from './game-scenes.js';
import type { MapOp } from './map/ops.js';

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

// Итог правки сцены мастером (docs/plan/game.md, этап 6). sceneSeq — номер правки сцены
// после неё (game_scenes.seq), cells и objects — сколько клеток и объектов изменилось.
// Сам changeset в запись не входит: он бывает большим, его читают отмена и рассылка.
export interface SceneEditResult {
  scene: GameSceneRef;
  sceneSeq: number;
  cells: number;
  objects: number;
}

// Отмена и возврат: conflicts — изменения, которые не тронуты, потому что их уже
// поменяли после этой правки.
export interface SceneReplayResult extends SceneEditResult {
  conflicts: number;
}

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
  // Встречу начинает и заканчивает мастер; пока она идёт, листы на местах закрыты.
  // libraryCopied — сколько записей справочников начало встречи скопировало в библиотеку
  // игры; у записей до библиотеки (этап 4) result — null.
  'session.started': { intent: null; result: { libraryCopied: number } | null };
  'session.ended': { intent: null; result: { startedAt: string } };
  // Мастер обновил копию в библиотеке из справочника; copied — сколько новых связей
  // докопировано вместе с ней.
  'library.refreshed': {
    intent: GameLibraryRef;
    result: { name: string; copied: number };
  };
  // Мастер добавил сцену из своей карты. libraryCopied — сколько записей скопировано в
  // библиотеку с её объектами; active — первая сцена игры сразу стала активной.
  'scene.created': {
    intent: { mapId: string };
    result: { scene: GameSceneRef; libraryCopied: number; active: boolean };
  };
  'scene.activated': {
    intent: { sceneId: string };
    result: { scene: GameSceneRef };
  };
  // Новая копия той же карты встала на место старой (from); старая остаётся в базе.
  'scene.restarted': {
    intent: { sceneId: string };
    result: { from: GameSceneRef; scene: GameSceneRef; libraryCopied: number };
  };
  // «Сцена открыта игрокам» включили или выключили; scene — активная в этот момент.
  'scene.opened': { intent: null; result: { scene: GameSceneRef } };
  'scene.closed': { intent: null; result: { scene: GameSceneRef | null } };
  // Мастер правит сцену в игре — блоки и объекты, как в редакторе карты. libraryCopied —
  // сколько новых записей справочников (монстр, НПС, предмет) скопировано в библиотеку.
  'scene.edited': {
    intent: { ops: MapOp[] };
    result: SceneEditResult & { libraryCopied: number };
  };
  // Отменена правка seq (запись scene.edited).
  'scene.undone': { intent: { seq: number }; result: SceneReplayResult };
  // Возвращена правка seq, которую сняла отмена undoSeq.
  'scene.redone': {
    intent: { seq: number; undoSeq: number };
    result: SceneReplayResult;
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
