import { describe, expect, it } from 'vitest';
import { BOOK_ARMOR_STATS } from './bookArmor.js';
import { itemEquip } from './equipment.js';
import {
  combatAttuneProblem,
  combatEquipProblem,
  EQUIP_COMBAT_ARMOR,
  EQUIP_COMBAT_ATTUNE,
  equipCost,
  WEAPON_SWAP_COST,
} from './equipmentInPlay.js';
import type { ItemVariant } from './items.js';

const armor = (key: 'leather' | 'breastplate' | 'plate'): ItemVariant => {
  const { kind, armorClass, strength, stealthDisadvantage } =
    BOOK_ARMOR_STATS[key];
  return {
    category: 'armor',
    details: {
      base: key,
      kind,
      armorClass,
      strength,
      stealthDisadvantage,
      magicBonus: 0,
      attunement: false,
    },
  };
};
const shield = itemEquip({
  category: 'shield',
  details: { armorClass: 2, magicBonus: 0, attunement: false },
});
const sword = itemEquip({
  category: 'weapon',
  details: {
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
  },
});
const ring = itemEquip({
  category: 'jewelry',
  details: { slot: 'ring', attunement: true },
});

describe('экипировка во время встречи', () => {
  it('цена: оружие — домашнее правило, доспех по категории, щит — «Использование», украшения — нет', () => {
    expect(equipCost(sword)).toBe(WEAPON_SWAP_COST);
    expect(equipCost(itemEquip(armor('leather')))).toBe(
      'Надеть и снять — 1 минута',
    );
    expect(equipCost(itemEquip(armor('breastplate')))).toBe(
      'Надеть — 5 минут, снять — 1 минута',
    );
    expect(equipCost(itemEquip(armor('plate')))).toBe(
      'Надеть — 10 минут, снять — 5 минут',
    );
    expect(equipCost(shield)).toBe(
      'Надеть или снять — действие «Использование»',
    );
    expect(equipCost(ring)).toBeNull();
    expect(equipCost(null)).toBeNull();
  });

  it('в бою нельзя только доспех и настройку', () => {
    const plate = itemEquip(armor('plate'));
    expect(combatEquipProblem('tactical', plate)).toBe(EQUIP_COMBAT_ARMOR);
    expect(combatEquipProblem('free', plate)).toBeNull();
    expect(combatEquipProblem('tactical', shield)).toBeNull();
    expect(combatEquipProblem('tactical', sword)).toBeNull();
    expect(combatEquipProblem('tactical', ring)).toBeNull();
    expect(combatAttuneProblem('tactical')).toBe(EQUIP_COMBAT_ATTUNE);
    expect(combatAttuneProblem('free')).toBeNull();
  });
});
