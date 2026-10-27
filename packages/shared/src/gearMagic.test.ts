import { describe, expect, it } from 'vitest';
import { BOOK_ARMOR_STATS, BOOK_SHIELD } from './bookArmor.js';
import { BOOK_WEAPONS } from './bookWeapons.js';
import { itemEquip, type EquipSlot } from './equipment.js';
import { wornGear } from './gear.js';
import { gearArmorClass, unattunedBonusNote } from './gearArmorClass.js';
import { gearAttacks } from './gearAttacks.js';
import type { WeaponExtraDamage, WeaponItemDetails } from './itemEquipment.js';
import type { ItemVariant } from './items.js';

// Магия без настройки (docs/dnd/weapons-armor.md, «Магия без настройки»): без настройки
// действует только отмеченное.

function row(variant: ItemVariant, equipped: EquipSlot[], attuned: boolean) {
  return {
    equipped,
    attuned,
    item: {
      id: 'x',
      name: 'Пламенный меч',
      category: variant.category,
      rarity: 'rare' as const,
      weight: 0,
      isPublic: true,
      image: null,
      equip: itemEquip(variant),
    },
  };
}

const fire: WeaponExtraDamage = { count: 2, die: 6, type: 'fire' };
const sword = (over: Partial<WeaponItemDetails> = {}): ItemVariant => {
  const { weight: _w, cost: _c, ...stats } = BOOK_WEAPONS.longsword;
  return {
    category: 'weapon',
    details: {
      ...stats,
      base: 'longsword',
      magicBonus: 1,
      attunement: true,
      extraDamage: [fire],
      ...over,
    },
  };
};

const input = {
  abilityScores: {
    strength: 16,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
  },
  proficiencyBonus: 2,
  weapons: ['martial' as const],
};
const attack = (variant: ItemVariant, attuned: boolean) => {
  const gear = wornGear([row(variant, ['meleeMain'], attuned)]);
  const [first] = gearAttacks(gear, input);
  return { weapon: gear.weapons[0], attack: first };
};

describe('магия без настройки', () => {
  it('не настроен — ни бонуса, ни доп. урона; что выключено — в inactive', () => {
    const { weapon, attack: a } = attack(sword(), false);
    expect(a.attackBonus).toBe(3 + 2);
    expect(a.damageBonus).toBe(3);
    expect(weapon.details.extraDamage).toEqual([]);
    expect(weapon.inactive).toEqual({ bonus: 1, extraDamage: [fire] });
  });

  it('настроен — действует всё', () => {
    const { weapon, attack: a } = attack(sword(), true);
    expect(a.attackBonus).toBe(3 + 2 + 1);
    expect(weapon.details.extraDamage).toEqual([fire]);
    expect(weapon.inactive).toBeNull();
  });

  it('отмеченное «Действует без настройки» остаётся', () => {
    const cold = { count: 1, die: 6, type: 'cold', withoutAttunement: true };
    const { weapon, attack: a } = attack(
      sword({
        bonusWithoutAttunement: true,
        extraDamage: [fire, cold as WeaponExtraDamage],
      }),
      false,
    );
    expect(a.attackBonus).toBe(3 + 2 + 1);
    expect(weapon.details.extraDamage).toEqual([cold]);
    expect(weapon.inactive).toEqual({ bonus: 0, extraDamage: [fire] });
  });

  it('всё отмечено или настройка не нужна — выключенного нет', () => {
    const all = sword({
      bonusWithoutAttunement: true,
      extraDamage: [{ ...fire, withoutAttunement: true }],
    });
    expect(attack(all, false).weapon.inactive).toBeNull();
    const plain = sword({ attunement: false });
    expect(attack(plain, false).attack.attackBonus).toBe(3 + 2 + 1);
    expect(attack(plain, false).weapon.inactive).toBeNull();
  });

  it('доспех и щит: КД без бонуса магии и строка «Нет настройки»', () => {
    const { kind, armorClass, strength, stealthDisadvantage } =
      BOOK_ARMOR_STATS.chainMail;
    const mail: ItemVariant = {
      category: 'armor',
      details: {
        base: 'chainMail',
        kind,
        armorClass,
        strength,
        stealthDisadvantage,
        magicBonus: 2,
        attunement: true,
      },
    };
    const shield: ItemVariant = {
      category: 'shield',
      details: {
        armorClass: BOOK_SHIELD.armorClass,
        magicBonus: 1,
        attunement: true,
      },
    };
    const gear = wornGear([
      {
        ...row(mail, ['body'], false),
        item: { ...row(mail, [], false).item, name: 'Кольчуга' },
      },
      {
        ...row(shield, ['meleeOff'], false),
        item: { ...row(shield, [], false).item, name: 'Щит' },
      },
    ]);
    const result = gearArmorClass(gear, {
      unarmored: 10,
      dexterity: 10,
      training: ['heavy', 'shield'],
    });
    expect(result.armorClass).toBe(16 + 2);
    expect(result.unattuned).toEqual([
      unattunedBonusNote(2, 'доспеха «Кольчуга»'),
      unattunedBonusNote(1, 'щита «Щит»'),
    ]);
  });
});
