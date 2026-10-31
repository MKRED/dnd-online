import type { GameFigure, GameFigures, GameMoveMode, Vec3 } from 'shared';
import { apiRequest as request } from '../../lib/apiRequest';

// Фигурки персонажей на активной сцене (docs/plan/done/game.md, этап 7).

// Закрытая игроку сцена — 403, нет активной — 404.
export function getGameFigures(gameId: string): Promise<GameFigures> {
  return request(`/games/${gameId}/scene/figures`);
}

// Миниатюра фигурки. id картинки — в адресе: у новой основной картинки своя версия
// начинается с единицы, и без него браузер показал бы прежнюю из кеша.
export function figureImagePath(
  gameId: string,
  figure: Pick<GameFigure, 'character' | 'image'>,
): string | null {
  const { image } = figure;
  if (!image) return null;
  return `/games/${gameId}/figures/${figure.character.id}/image?i=${image.id}&v=${image.thumbVersion}`;
}

// 3D-модель фигурки (docs/plan/done/character-models.md, этап 3): версия в адресе — новая
// загрузка не берётся из кеша.
export function figureModelPath(
  gameId: string,
  figure: Pick<GameFigure, 'character'>,
  version: number,
): string {
  return `/games/${gameId}/figures/${figure.character.id}/model?v=${version}`;
}

// Правки отвечают фигурками глазами того, кто правил.
const figuresBase = (gameId: string) => `/games/${gameId}/figures`;

export function moveGameFigure(
  gameId: string,
  characterId: string,
  to: Vec3,
): Promise<GameFigures> {
  return request(`${figuresBase(gameId)}/${characterId}/move`, {
    method: 'POST',
    body: JSON.stringify({ to }),
  });
}

// Мастер ставит фигурку без пути и запаса.
export function placeGameFigure(
  gameId: string,
  characterId: string,
  at: Vec3,
): Promise<GameFigures> {
  return request(`${figuresBase(gameId)}/${characterId}`, {
    method: 'PUT',
    body: JSON.stringify({ at }),
  });
}

// «Новый раунд»: запас движения всех фигурок снова полный.
export function startFiguresRound(gameId: string): Promise<GameFigures> {
  return request(`${figuresBase(gameId)}/round`, { method: 'POST' });
}

// Режим хода игры: «Начать бой» и «Закончить бой» мастера (docs/dnd/movement.md).
export function setGameMoveMode(
  gameId: string,
  mode: GameMoveMode,
): Promise<GameFigures> {
  return request(`${figuresBase(gameId)}/mode`, {
    method: 'PUT',
    body: JSON.stringify({ mode }),
  });
}

// Мастер запрещает или разрешает игрокам ходить: одному герою или всем (characterId null).
export function setFiguresMoveLock(
  gameId: string,
  characterId: string | null,
  locked: boolean,
): Promise<GameFigures> {
  return request(`${figuresBase(gameId)}/lock`, {
    method: 'PUT',
    body: JSON.stringify({ characterId, locked }),
  });
}

// Запас одной фигурки: обновить или добавить «Рывок».
export function changeFigureAllowance(
  gameId: string,
  characterId: string,
  change: 'refresh' | 'dash',
): Promise<GameFigures> {
  return request(`${figuresBase(gameId)}/${characterId}/${change}`, {
    method: 'POST',
  });
}

// Всё, чем страница сцены правит фигурки этой игры.
export function figureApi(gameId: string) {
  return {
    move: (characterId: string, to: Vec3) =>
      moveGameFigure(gameId, characterId, to),
    place: (characterId: string, at: Vec3) =>
      placeGameFigure(gameId, characterId, at),
    round: () => startFiguresRound(gameId),
    mode: (mode: GameMoveMode) => setGameMoveMode(gameId, mode),
    lock: (characterId: string | null, locked: boolean) =>
      setFiguresMoveLock(gameId, characterId, locked),
    allowance: (characterId: string, change: 'refresh' | 'dash') =>
      changeFigureAllowance(gameId, characterId, change),
  };
}
