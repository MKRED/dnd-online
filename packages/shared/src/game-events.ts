import type {
  GameCharacterChange,
  GameCharacterState,
} from './game-characters.js';
import type {
  GameCreatureChange,
  GameCreatureHitPoints,
  GameEventCreature,
} from './game-creatures.js';
import type { GameEventVisibility } from './game-event-visibility.js';
import type { GameFigurePlacement, GameMoveMode } from './game-figures.js';
import type { GameUser } from './games.js';
import type { GameLibraryRef } from './game-library.js';
import type { GameSceneRef } from './game-scenes.js';
import type { Vec3 } from './map/coords.js';
import type { MapOp } from './map/ops.js';
import type { SpellSlots } from './character.js';
import type { EquipSlot } from './equipment.js';
import type { GameEquipmentChange } from './equipmentInPlay.js';
import type { SpellSlotsExpended } from './spellSlots.js';

// Журнал игры (docs/plan/done/game.md, «Журнал игры»): каждое действие в игре — запись с
// номером по порядку внутри игры. Записи только добавляются; отмена — тоже запись.
// Сам журнал пока видит только мастер; кому из игроков видна запись — visibility
// (game-event-visibility.ts), а группа записи для журнала — game-event-groups.ts.

// Сколько записей отдаёт одна страница журнала, если не просили меньше.
export const GAME_EVENTS_PAGE = 50;
export const GAME_EVENTS_PAGE_MAX = 100;

// Персонаж, как он звался в момент события: журнал читается и после его удаления.
export interface GameEventCharacter {
  id: string;
  name: string;
}

// Эффект, как он звался в момент события.
export interface GameEventEffect {
  id: string;
  name: string;
}

// От имени кого сделано. Нет записи — человек действовал сам за себя (вошёл в лобби,
// занял место). Персонажи и монстры появятся с фигурками на сцене.
export type GameEventAs =
  | { kind: 'master' }
  | { kind: 'character'; id: string }
  | { kind: 'monster'; id: string };

// Итог правки сцены мастером (docs/plan/done/game.md, этап 6). sceneSeq — номер правки сцены
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
  // Мастер отдал управление персонажем участнику (controller) или забрал (null).
  'seat.controller': {
    intent: { userId: string; controllerId: string | null };
    result: { character: GameEventCharacter; controller: GameUser | null };
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
  // Мастер включил или выключил туман войны сцены или сменил дальность обзора.
  'scene.fog': {
    intent: { enabled: boolean; sightRange: number };
    result: { scene: GameSceneRef };
  };
  // Мастер сбросил туман войны сцены: игроки забыли открытое и открывают его заново.
  'scene.fogReset': { intent: null; result: { scene: GameSceneRef } };
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
  // Фигурки встали на свободные стартовые точки активной сцены (этап 7): сцена стала
  // активной (scene) или персонаж сел на место (seat). unplaced — кому точки не хватило.
  'figures.placed': {
    intent: { reason: 'scene' | 'seat' };
    result: {
      scene: GameSceneRef;
      placed: GameFigurePlacement[];
      unplaced: GameEventCharacter[];
    };
  };
  // Ход фигурки по пути: cost — сколько футов он стоил, left — сколько запаса осталось.
  // path — клетки пути от from до to (анимация хода, docs/plan/done/walk-animation.md); у
  // записей до 2026-10-24 его нет.
  'figure.moved': {
    intent: { characterId: string; to: Vec3 };
    result: {
      character: GameEventCharacter;
      from: Vec3;
      to: Vec3;
      cost: number;
      left: number;
      path?: Vec3[];
    };
  };
  // Мастер поставил фигурку без пути и запаса; from — null, если её не было на сцене.
  'figure.placed': {
    intent: { characterId: string; at: Vec3 };
    result: { character: GameEventCharacter; from: Vec3 | null; to: Vec3 };
  };
  // «Новый раунд»: запас движения снова полный у всех фигурок (count) и у монстров и НПС
  // активной сцены (creatures; в записях до хода монстров его нет).
  'figures.round': {
    intent: null;
    // round — номер раунда боя (с начала боя или сцены в тактическом режиме); у записей до
    // 2026-10-24 его нет.
    result: {
      scene: GameSceneRef;
      count: number;
      creatures?: number;
      round?: number;
    };
  };
  // Мастер сменил режим хода (docs/dnd/movement.md): запас снова полный у всех фигурок
  // (count) и у монстров и НПС активной сцены (creatures); round — 1 в начале боя, null
  // в свободном режиме.
  'game.mode': {
    intent: { mode: GameMoveMode };
    result: {
      mode: GameMoveMode;
      scene: GameSceneRef;
      count: number;
      creatures: number;
      round: number | null;
    };
  };
  // Запас одной фигурки обновлён (её новый ход) или к нему добавлен «Рывок».
  'figure.refreshed': {
    intent: { characterId: string };
    result: { character: GameEventCharacter };
  };
  'figure.dashed': {
    intent: { characterId: string };
    result: { character: GameEventCharacter; dashes: number };
  };
  // Хиты, спасброски или ячейки персонажа в игре (этап 8). instantDeath — урон сверх
  // нуля не меньше максимума хитов.
  'character.changed': {
    intent: { characterId: string; change: GameCharacterChange };
    result: {
      character: GameEventCharacter;
      before: GameCharacterState;
      after: GameCharacterState;
      instantDeath: boolean;
    };
  };
  // Эффект наложен на персонажа в игре; libraryCopied — сколько записей скопировано в
  // библиотеку игры вместе с ним.
  'character.effect_added': {
    intent: { characterId: string; effectId: string };
    result: {
      character: GameEventCharacter;
      effect: GameEventEffect;
      libraryCopied: number;
    };
  };
  // Эффект снят; effect — null, если его карточки уже нет ни в библиотеке, ни в справочнике.
  'character.effect_removed': {
    intent: { characterId: string; entryId: string };
    result: { character: GameEventCharacter; effect: GameEventEffect | null };
  };
  // Кукла персонажа в игре (docs/plan/equipment.md, этап 4): надел, снял, настроился. item —
  // вещь, как она звалась в тот момент (null — место было пустым или вещь скрыта); freed —
  // места, которые освободила надетая вещь (двуручное снимает вторую руку).
  'character.equipment': {
    intent: { characterId: string; change: GameEquipmentChange };
    result: {
      character: GameEventCharacter;
      item: { id: string; name: string } | null;
      freed: EquipSlot[];
    };
  };
  // Хиты монстра или НПС на сцене (этап 8); правит только мастер.
  'creature.changed': {
    intent: { objectId: number; change: GameCreatureChange };
    result: {
      creature: GameEventCreature;
      before: GameCreatureHitPoints;
      after: GameCreatureHitPoints;
    };
  };
  // Ход монстра или НПС по пути (ход монстров — docs/plan/done/creature-movement.md). Это и
  // правка сцены: запись несёт changeset (moveObject и взгляд), игроки получают её
  // рассылкой правок, «Отменить» мастера снимает её как scene.edited.
  'creature.moved': {
    intent: { objectId: number; to: Vec3 };
    result: SceneEditResult & {
      creature: GameEventCreature;
      from: Vec3;
      to: Vec3;
      cost: number;
      left: number;
      // Клетки пути, как у figure.moved.
      path?: Vec3[];
    };
  };
  // Запас одного существа обновлён или к нему добавлен «Рывок».
  'creature.refreshed': {
    intent: { objectId: number };
    result: { creature: GameEventCreature };
  };
  'creature.dashed': {
    intent: { objectId: number };
    result: { creature: GameEventCreature; dashes: number };
  };
  // Ячейки заклинаний экземпляра НПС потрачены или возвращены (вариант А после первой
  // партии, 2026-10-26).
  'creature.slots_changed': {
    intent: { objectId: number; expended: SpellSlotsExpended };
    result: {
      creature: GameEventCreature;
      before: SpellSlots;
      after: SpellSlots;
    };
  };
  // Отметка «подготовлено» у заклинания экземпляра НПС.
  'creature.prepared': {
    intent: { objectId: number; abilityId: string; prepared: boolean };
    result: {
      creature: GameEventCreature;
      ability: { id: string; name: string };
    };
  };
  'creature.effect_added': {
    intent: { objectId: number; effectId: string };
    result: {
      creature: GameEventCreature;
      effect: GameEventEffect;
      libraryCopied: number;
    };
  };
  'creature.effect_removed': {
    intent: { objectId: number; entryId: string };
    result: { creature: GameEventCreature; effect: GameEventEffect | null };
  };
  // Мастер убрал игрока.
  'member.removed': {
    intent: { userId: string };
    result: { member: GameUser; character: GameEventCharacter | null };
  };
  // Мастер изменил, обновил из оригинала или удалил свою группу блоков, которая стоит на
  // сценах игры (docs/plan/blocks.md, этап 7): клиенты перечитывают сцену с новыми
  // описаниями блоков, сервер пересчитывает туман. Удалённая группа на сценах — пустота.
  'blocks.changed': {
    intent: { groupId: string };
    result: {
      group: { id: string; name: string };
      deleted: boolean;
      scenes: GameSceneRef[];
    };
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
  visibility: GameEventVisibility;
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
