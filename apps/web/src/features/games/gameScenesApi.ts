import type { GameScenes, GameSceneView } from 'shared';
import type { ObjectImagePaths } from '../maps/MapScene';
import { apiRequest as request } from '../../lib/apiRequest';

// Сцены игры (docs/plan/game.md, этап 5): блок мастера в лобби и страница сцены.
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

// Активная сцена; закрытая игроку — 403, нет активной — 404.
export function getGameScene(gameId: string): Promise<GameSceneView> {
  return request(`/games/${gameId}/scene`);
}

export function scenePagePath(gameId: string): string {
  return `/games/${gameId}/scene`;
}

// Миниатюры объектов сцены — копии из библиотеки игры. У НПС путь — по самому НПС и
// версии копии: id картинки галереи игре не нужен.
export function sceneObjectImages(gameId: string): ObjectImagePaths {
  const path = (kind: string, id: string, version: number) =>
    `/games/${gameId}/scene/images/${kind}/${id}?variant=thumb&v=${version}`;
  return {
    monster: (id, version) => path('monster', id, version),
    item: (id, version) => path('item', id, version),
    npc: (id, image) => path('npc', id, image.thumbVersion),
  };
}
