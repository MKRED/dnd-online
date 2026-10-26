import type {
  Character,
  EquipSlot,
  GameCharacterChange,
  GameCreatureChange,
  GameCreatures,
  SpellSlotsExpended,
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

// Кукла персонажа в игре (docs/plan/equipment.md, этап 4) — ответ листом целиком: КД и
// атаки меняются вместе с ней.
export function equipGameCharacter(
  gameId: string,
  characterId: string,
  slot: EquipSlot,
  entryId: string,
): Promise<Character> {
  return request(
    `${gameCharacterBase(gameId, characterId)}/equipment/${slot}`,
    {
      method: 'PUT',
      body: JSON.stringify({ entryId }),
    },
  );
}

export function unequipGameCharacter(
  gameId: string,
  characterId: string,
  slot: EquipSlot,
): Promise<Character> {
  return request(
    `${gameCharacterBase(gameId, characterId)}/equipment/${slot}`,
    {
      method: 'DELETE',
    },
  );
}

export function attuneGameCharacter(
  gameId: string,
  characterId: string,
  entryId: string,
  attuned: boolean,
): Promise<Character> {
  return request(
    `${gameCharacterBase(gameId, characterId)}/items/${entryId}/attunement`,
    { method: attuned ? 'PUT' : 'DELETE' },
  );
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

// Ячейки и подготовка заклинаний экземпляра НПС (вариант А после первой партии) — ответ
// существами сцены.
export function spendGameCreatureSlots(
  gameId: string,
  objectId: number,
  expended: SpellSlotsExpended,
): Promise<GameCreatures> {
  return request(`${creaturesBase(gameId)}/${objectId}/spell-slots`, {
    method: 'POST',
    body: JSON.stringify({ expended }),
  });
}

export function prepareGameCreatureSpell(
  gameId: string,
  objectId: number,
  abilityId: string,
  prepared: boolean,
): Promise<GameCreatures> {
  return request(
    `${creaturesBase(gameId)}/${objectId}/abilities/${abilityId}`,
    { method: 'PUT', body: JSON.stringify({ prepared }) },
  );
}
