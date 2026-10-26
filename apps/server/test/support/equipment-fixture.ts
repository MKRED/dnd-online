import type request from 'supertest';
import { createItem, type CreatedItem } from './item-fixture.js';

// Предметы экипировки для тестов куклы (docs/plan/equipment.md, этап 2).

export function weaponDetails(over: Record<string, unknown> = {}) {
  return {
    base: null,
    weaponCategory: 'martial',
    attackType: 'melee',
    damage: { count: 1, die: 8, type: 'slashing' },
    extraDamage: [],
    properties: [],
    thrown: null,
    ammunition: null,
    versatile: null,
    mastery: null,
    magicBonus: 0,
    attunement: false,
    ...over,
  };
}

export const createWeapon = (
  agent: request.Agent,
  name: string,
  over: Record<string, unknown> = {},
): Promise<CreatedItem> =>
  createItem(agent, { name, category: 'weapon', details: weaponDetails(over) });

// Магическое кольцо: настройка бывает только у предмета с редкостью.
export const createRing = (
  agent: request.Agent,
  name: string,
  attunement: boolean,
): Promise<CreatedItem> =>
  createItem(agent, {
    name,
    category: 'jewelry',
    rarity: attunement ? 'rare' : 'none',
    details: { slot: 'ring', attunement },
  });

export const createShield = (agent: request.Agent): Promise<CreatedItem> =>
  createItem(agent, {
    name: 'Щит',
    category: 'shield',
    details: { armorClass: 2, magicBonus: 0, attunement: false },
  });

export const equipmentUrl = (characterId: string, slot: string) =>
  `/api/characters/${characterId}/equipment/${slot}`;

export const attunementUrl = (characterId: string, entryId: string) =>
  `/api/characters/${characterId}/items/${entryId}/attunement`;
