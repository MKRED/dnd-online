import type {
  Character,
  GameCharacterChange,
  GameCreatureChange,
  GameCreatures,
} from 'shared';
import { apiRequest as request } from '../../lib/apiRequest';

// Состояние существ в игре (docs/plan/game.md, этап 8): персонажи игроков — лист, хиты,
// ячейки; монстры и НПС сцены — экземпляры. Эффекты — по адресам из effectLinksApi.

export const gameCharacterBase = (gameId: string, characterId: string) =>
  `/games/${gameId}/characters/${characterId}`;

// Полный лист из игры: мастеру, владельцу и управляющему.
export function getGameCharacter(
  gameId: string,
  characterId: string,
): Promise<Character> {
  return request(gameCharacterBase(gameId, characterId));
}

export function changeGameCharacter(
  gameId: string,
  characterId: string,
  change: GameCharacterChange,
): Promise<Character> {
  return request(`${gameCharacterBase(gameId, characterId)}/changes`, {
    method: 'POST',
    body: JSON.stringify(change),
  });
}

const creaturesBase = (gameId: string) => `/games/${gameId}/scene/creatures`;

export const gameCreatureEffectsBase = (gameId: string, objectId: number) =>
  `${creaturesBase(gameId)}/${objectId}/effects`;

// Мастеру — хиты и эффекты, игроку — метки здоровья видимых существ.
export function getGameCreatures(gameId: string): Promise<GameCreatures> {
  return request(creaturesBase(gameId));
}

export function changeGameCreature(
  gameId: string,
  objectId: number,
  change: GameCreatureChange,
): Promise<GameCreatures> {
  return request(`${creaturesBase(gameId)}/${objectId}/changes`, {
    method: 'POST',
    body: JSON.stringify(change),
  });
}
