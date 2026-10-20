import type { MapChunksResponse } from './map/api.js';

// Сцены игры (docs/plan/game.md, «Сцены и смена карты на ходу»): копия карты мастера
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
}

// Активная сцена для страницы сцены: блоки и объекты в форме ответа карты, справочник
// ссылок — из библиотеки игры. Игроку не уходят скрытые объекты и содержимое
// контейнеров (решено с пользователем 2026-10-20).
export interface GameSceneView extends MapChunksResponse {
  scene: GameSceneStatus;
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
