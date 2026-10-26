import { describe, expect, it } from 'vitest';
import { BOOK_ARMOR_STATS } from './bookArmor.js';
import { itemEquip } from './equipment.js';
import {
  combatAttuneProblem,
  combatEquipProblem,
  EQUIP_COMBAT_ARMOR,
  EQUIP_COMBAT_ATTUNE,
  equipCost,
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
const ring = itemEquip({
  category: 'jewelry',
  details: { slot: 'ring', attunement: true },
});

describe('экипировка во время встречи', () => {
  it('цена по книге: доспех по категории, щит — «Использование», украшения — нет', () => {
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
    expect(combatEquipProblem('tactical', ring)).toBeNull();
    expect(combatAttuneProblem('tactical')).toBe(EQUIP_COMBAT_ATTUNE);
    expect(combatAttuneProblem('free')).toBeNull();
  });
});
