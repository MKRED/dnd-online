import type { GameFigure, GameFigures } from 'shared';
import { apiRequest as request } from '../../lib/apiRequest';

// Фигурки персонажей на активной сцене (docs/plan/game.md, этап 7).

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
