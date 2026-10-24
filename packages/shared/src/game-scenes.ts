import type { MapChunksResponse } from './map/api.js';
import type { PackedChangeset } from './map/changesetPacking.js';
import type { Vec3 } from './map/coords.js';

// Сцены игры (docs/plan/done/game.md, «Сцены и смена карты на ходу»): копия карты мастера
// внутри игры. Активная сцена одна; игроки видят её, только пока мастер её не закрыл.

export interface GameSceneRef {
  id: string;
  name: string;
}

// Сцена в списке мастера. Перезапущенные сцены в список не попадают: они остаются
// в базе и в журнале.
export interface GameScene extends GameSceneRef {
  // Карта, из которой сцена скопирована; null — карту удалили, перезапустить нельзя.
  mapId: string | null;
  active: boolean;
  createdAt: string;
  // Туман войны (docs/plan/done/fog-of-war.md): включён ли и дальность обзора в футах.
  fog: boolean;
  sightRange: number;
}

// Дальность обзора — домашнее правило до появления света (docs/dnd/vision.md): по
// умолчанию 60 футов, не больше 120 — предел выбран замером расчёта (план, этап 1).
export const SIGHT_RANGE_DEFAULT = 60;
export const SIGHT_RANGE_MAX = 120;
export const SIGHT_RANGE_STEP = 5;

export interface GameSceneFogInput {
  enabled: boolean;
  sightRange: number;
}

// Блок «Сцены» в лобби мастера: переключатель и список. Каждая правка сцен отвечает им.
export interface GameScenes {
  // «Сцена открыта игрокам». У новой игры закрыта.
  open: boolean;
  scenes: GameScene[];
}

// Активная сцена в лобби. Игроку — только открытая: закрытую мастер готовит тайно, и
// даже её имя игрокам не уходит.
export interface GameSceneStatus extends GameSceneRef {
  open: boolean;
  // Туман войны сцены (docs/plan/done/fog-of-war.md): включён ли и дальность обзора в футах.
  fog: boolean;
  sightRange: number;
}

// Активная сцена для страницы сцены: блоки и объекты в форме ответа карты, справочник
// ссылок — из библиотеки игры. Игроку не уходят скрытые объекты и содержимое
// контейнеров (решено с пользователем 2026-10-20).
export interface GameSceneView extends MapChunksResponse {
  scene: GameSceneStatus;
  // Содержимое контейнеров убрано (игроку): пустой список — не «пусто», а «неизвестно».
  contentsHidden: boolean;
  // Туман войны игрока (docs/plan/done/fog-of-war.md): что группа открыла и что видит сейчас.
  // null — тумана нет (выключен или смотрит мастер), видно всё. Чанков блоков вне
  // открытого игрок не получает вовсе.
  fog: GameSceneFogView | null;
}

// Биты одного чанка маски (512 байт в base64): бит с тем же индексом, что у клетки
// в чанке. Чанка нет в списке — в нём ничего не отмечено.
export interface FogChunkBits {
  cx: number;
  cy: number;
  cz: number;
  bits: string;
}

export interface GameSceneFogView {
  explored: FogChunkBits[];
  visible: FogChunkBits[];
}

// Что запись журнала меняет у игроков под туманом (docs/plan/done/fog-of-war.md, этап 4):
// посчитано в той же транзакции, что и сама запись, по маскам до и после. seq — номер
// правки сцены, на который ложится changes; fog — изменившиеся чанки масок.
export interface ScenePlayerFog {
  sceneId: string;
  seq: number;
  changes: PackedChangeset;
  fog: GameSceneFogView;
  // Ход существа (creature.moved): его путь глазами игрока, как в GameWalkMessage; null —
  // группа не видела ни одной его клетки. У записей до 2026-10-24 поля нет.
  walk?: (Vec3 | null)[] | null;
}

export interface GameSceneAddInput {
  mapId: string;
}

export interface GameSceneActivateInput {
  sceneId: string;
}

export interface GameSceneOpenInput {
  open: boolean;
}
