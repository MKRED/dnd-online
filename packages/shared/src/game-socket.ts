import type { GameSceneFogView } from './game-scenes.js';
import type { GameEvent, GameEventKind } from './game-events.js';
import type { PackedChangeset } from './map/changesetPacking.js';
import type { Vec3 } from './map/coords.js';
import type { MapObjectRefsView } from './map/objects/objectRefViews.js';

// Сокет игры (docs/plan/done/game.md, этап 3): живые изменения лобби и присутствие. Входит
// по cookie сессии, как и REST; путь — под /api, чтобы прокси и прод вели его туда же.
export const GAME_SOCKET_PATH = '/api/socket.io';

// Названия сообщений в обе стороны.
export const GAME_SOCKET = {
  // клиент → сервер, с ответом (ack)
  join: 'game:join',
  leave: 'game:leave',
  // клиент → сервер, без ответа: куда сейчас тянут фигурку (этап 7)
  figureDrag: 'game:figure-drag',
  // сервер → клиент
  changed: 'game:changed',
  event: 'game:event',
  presence: 'game:presence',
  closed: 'game:closed',
  sceneEdit: 'game:scene-edit',
  sceneFog: 'game:scene-fog',
  figureDragged: 'game:figure-dragged',
} as const;

// События, после которых туман войны активной сцены пересчитывается (docs/plan/done/fog-of-war.md,
// «Когда пересчитываем»): сервер пересчитывает его в записи журнала, а мастер в режиме
// «Глазами игроков» перечитывает маски.
export const FOG_EVENT_KINDS: ReadonlySet<GameEventKind> =
  new Set<GameEventKind>([
    // Сцена и её настройки.
    'scene.activated',
    'scene.restarted',
    'scene.fog',
    // Правки мастера: блоки (снесли стену — за ней видно), объекты, отмена и возврат.
    'scene.edited',
    'scene.undone',
    'scene.redone',
    'creature.moved',
    // Фигурки и смотрящие.
    'figures.placed',
    'figure.placed',
    'figure.moved',
    'seat.freed',
    'member.left',
    'member.removed',
    // Хиты персонажа: без сознания он не смотрит.
    'character.changed',
  ]);

// Правки сцены, которые клиент применяет к своей копии, а не перечитывает её.
export const SCENE_EDIT_KINDS: readonly GameEventKind[] = [
  'scene.edited',
  'scene.undone',
  'scene.redone',
  'creature.moved',
];

// Фигурки на сцене (этап 7): страница сцены перечитывает фигурки, а не всю сцену, лобби
// не меняется — ход за ходом лобби перечитывалось бы у всех.
export const FIGURE_KINDS: readonly GameEventKind[] = [
  'figures.placed',
  'figure.moved',
  'figure.placed',
  'figures.round',
  'figure.refreshed',
  'figure.dashed',
];

// Состояние персонажей, монстров и НПС в игре (этап 8): страница сцены перечитывает
// фигурки и существа (метки здоровья) и открытую карточку, лобби не меняется — как с
// фигурками.
export const CREATURE_KINDS: readonly GameEventKind[] = [
  'character.changed',
  'character.effect_added',
  'character.effect_removed',
  'creature.changed',
  'creature.effect_added',
  'creature.effect_removed',
  'creature.refreshed',
  'creature.dashed',
];

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

// Правка сцены (docs/plan/done/game.md, этап 6): мастеру — целиком, игрокам — без скрытых
// объектов и содержимого контейнеров и только для активной открытой сцены. seq — номер
// правки сцены после неё: копия на номер раньше применяет changes, иначе сцена
// перечитывается. Игроку приходит и правка, в которой для него ничего не изменилось, —
// чтобы номера шли без пропусков.
export interface GameSceneEditMessage {
  gameId: string;
  sceneId: string;
  seq: number;
  changes: PackedChangeset;
  // Справочник ссылок затронутых объектов — из библиотеки игры.
  refs: MapObjectRefsView;
  // Игроку под туманом войны (docs/plan/done/fog-of-war.md, этап 4): чанки масок, которые эта
  // правка изменила, — целиком, взамен прежних. changes тогда уже включает и то, что
  // правка открыла (блоки как поставленные, существа как появившиеся).
  fog?: GameSceneFogView;
}

// Туман игрока изменился без правки сцены (ход фигурки, хиты персонажа): seq — номер
// правки сцены, на котором он посчитан. Копия с этим номером применяет changes, не двигая
// номер, и заменяет чанки масок; с другим номером — перечитывает сцену.
export interface GameSceneFogMessage {
  gameId: string;
  sceneId: string;
  seq: number;
  changes: PackedChangeset;
  refs: MapObjectRefsView;
  fog: GameSceneFogView;
}

// Фигурку тянут (docs/plan/done/game.md, этап 7): промежуточные позиции идут только по сокету,
// в базу и журнал попадает лишь ход или постановка при отпускании. at — клетка ног под
// курсором; null — фигурку отпустили. Сервер пересылает это остальным в комнате (игрокам —
// пока сцена открыта).
export interface GameFigureDragMessage {
  gameId: string;
  characterId: string;
  at: Vec3 | null;
}

// Чаще клиент позицию не шлёт; чужая тень без новостей дольше FIGURE_DRAG_STALE_MS
// пропадает (тянувший мог отключиться посреди перетаскивания).
export const FIGURE_DRAG_INTERVAL_MS = 100;
export const FIGURE_DRAG_STALE_MS = 2000;

// Комната закрыта для этого клиента: игру удалили или его убрали из закрытой игры.
export interface GameClosedMessage {
  gameId: string;
  reason: 'deleted' | 'removed';
}
