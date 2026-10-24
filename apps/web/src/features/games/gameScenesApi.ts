import type {
  GameSceneFogInput,
  GameSceneFogView,
  GameScenes,
  GameSceneView,
  MapEditResult,
} from 'shared';
import type { ObjectImagePaths } from '../maps/MapScene';
import type { MapEditApi } from '../maps/useMapEdits';
import { apiRequest as request } from '../../lib/apiRequest';

// Сцены игры (docs/plan/done/game.md, этап 5): блок мастера в лобби и страница сцены.
const scenesBase = (gameId: string) => `/games/${gameId}/scenes`;

export function listGameScenes(gameId: string): Promise<GameScenes> {
  return request(scenesBase(gameId));
}

export function addGameScene(
  gameId: string,
  mapId: string,
): Promise<GameScenes> {
  return request(scenesBase(gameId), {
    method: 'POST',
    body: JSON.stringify({ mapId }),
  });
}

export function activateGameScene(
  gameId: string,
  sceneId: string,
): Promise<GameScenes> {
  return request(`${scenesBase(gameId)}/active`, {
    method: 'PUT',
    body: JSON.stringify({ sceneId }),
  });
}

// Новая копия карты на месте старой.
export function restartGameScene(
  gameId: string,
  sceneId: string,
): Promise<GameScenes> {
  return request(`${scenesBase(gameId)}/${sceneId}/restart`, {
    method: 'POST',
  });
}

// «Сцена открыта игрокам».
export function setGameSceneOpen(
  gameId: string,
  open: boolean,
): Promise<GameScenes> {
  return request(`${scenesBase(gameId)}/open`, {
    method: 'PUT',
    body: JSON.stringify({ open }),
  });
}

// Туман войны сцены и дальность обзора (docs/plan/done/fog-of-war.md, этап 6).
export function setGameSceneFog(
  gameId: string,
  sceneId: string,
  input: GameSceneFogInput,
): Promise<GameScenes> {
  return request(`${scenesBase(gameId)}/${sceneId}/fog`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

// Служебный сброс тумана войны: игроки забывают открытое на сцене.
export function resetGameSceneFog(
  gameId: string,
  sceneId: string,
): Promise<GameScenes> {
  return request(`${scenesBase(gameId)}/${sceneId}/fog/reset`, {
    method: 'POST',
  });
}

// Маски тумана активной сцены — мастеру для «Глазами игроков»; null — туман выключен.
export async function getGameSceneFog(
  gameId: string,
): Promise<GameSceneFogView | null> {
  const { fog } = await request<{ fog: GameSceneFogView | null }>(
    `/games/${gameId}/scene/fog`,
  );
  return fog;
}

// Активная сцена; закрытая игроку — 403, нет активной — 404.
export function getGameScene(gameId: string): Promise<GameSceneView> {
  return request(`/games/${gameId}/scene`);
}

// Правки сцены мастером (этап 6) — как у карты: операции, отмена, возврат.
export function sceneEditApi(gameId: string, sceneId: string): MapEditApi {
  const base = `${scenesBase(gameId)}/${sceneId}`;
  const post = (path: string, body?: unknown): Promise<MapEditResult> =>
    request(`${base}/${path}`, {
      method: 'POST',
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
  return {
    applyOps: (ops) => post('ops', { ops }),
    undo: () => post('undo'),
    redo: () => post('redo'),
  };
}

export function scenePagePath(gameId: string): string {
  return `/games/${gameId}/scene`;
}

// Миниатюры и 3D-модели объектов сцены — копии из библиотеки игры. У НПС путь — по самому НПС и
// версии копии: id картинки галереи игре не нужен.
export function sceneObjectImages(gameId: string): ObjectImagePaths {
  const path = (kind: string, id: string, version: number) =>
    `/games/${gameId}/scene/images/${kind}/${id}?variant=thumb&v=${version}`;
  return {
    monster: (id, version) => path('monster', id, version),
    item: (id, version) => path('item', id, version),
    npc: (id, image) => path('npc', id, image.thumbVersion),
    npcModel: (id, version) =>
      `/games/${gameId}/scene/models/npc/${id}?v=${version}`,
    furnitureMesh: (id, version) =>
      `/games/${gameId}/scene/models/mesh/${id}?v=${version}`,
  };
}
