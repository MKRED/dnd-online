import type {
  Character,
  GameCharacterChange,
  GameCreatureChange,
  GameCreatures,
  Vec3,
} from 'shared';
import { apiRequest as request } from '../../lib/apiRequest';

// Состояние существ в игре (docs/plan/done/game.md, этап 8): персонажи игроков — лист, хиты,
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

// Ход монстра или НПС по пути и его запас (docs/plan/done/creature-movement.md) — ответ
// существами сцены, как у правки хитов.
export function moveGameCreature(
  gameId: string,
  objectId: number,
  to: Vec3,
): Promise<GameCreatures> {
  return request(`${creaturesBase(gameId)}/${objectId}/move`, {
    method: 'POST',
    body: JSON.stringify({ to }),
  });
}

export function changeGameCreatureAllowance(
  gameId: string,
  objectId: number,
  change: 'refresh' | 'dash',
): Promise<GameCreatures> {
  return request(`${creaturesBase(gameId)}/${objectId}/${change}`, {
    method: 'POST',
  });
}
