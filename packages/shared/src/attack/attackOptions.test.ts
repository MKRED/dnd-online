import { describe, expect, it } from 'vitest';
import { BOOK_WEAPONS } from '../bookWeapons.js';
import type { Character } from '../character.js';
import { itemEquip, type EquipSlot } from '../equipment.js';
import { wornGear } from '../gear.js';
import type { ItemVariant } from '../items.js';
import type { Weapon } from '../weapons.js';
import {
  heroAttacks,
  OFF_HAND_NOT_LIGHT,
  THROWN_LATER,
} from './attackOptions.js';
import { attackReachText, rangeBand } from './attackRange.js';
import { activeWeaponSet } from './weaponSets.js';

const weapon = (key: Weapon, magicBonus = 0): ItemVariant => {
  const { weight: _w, cost: _c, ...stats } = BOOK_WEAPONS[key];
  return {
    category: 'weapon',
    details: { ...stats, base: key, magicBonus, attunement: false },
  };
};

function row(name: string, variant: ItemVariant, equipped: EquipSlot[]) {
  return {
    equipped,
    attuned: false,
    item: {
      id: name,
      name,
      category: variant.category,
      rarity: 'none' as const,
      weight: 0,
      isPublic: true,
      image: null,
      equip: itemEquip(variant),
    },
  };
}

// Сила 16 (+3), Ловкость 14 (+2), мастерство +2, владеет простым и воинским оружием.
function hero(inventory: ReturnType<typeof row>[]) {
  return {
    abilityScores: {
      strength: 16,
      dexterity: 14,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
    },
    proficiencyBonus: 2,
    proficiencies: { weapons: ['simple', 'martial'] },
    inventory: inventory as unknown as Character['inventory'],
  } as Pick<
    Character,
    'abilityScores' | 'proficiencyBonus' | 'proficiencies' | 'inventory'
  >;
}

describe('атаки героя', () => {
  it('длинный меч +1: слагаемые броска и урона, Универсальное двумя руками', () => {
    const [sword, unarmed] = heroAttacks(
      hero([row('Длинный меч', weapon('longsword', 1), ['meleeMain'])]),
    );
    expect(sword).toMatchObject({
      key: 'meleeMain',
      kind: 'melee',
      set: 'melee',
      reach: 5,
      spend: 'action',
      unavailable: null,
    });
    expect(sword.terms).toEqual([
      { kind: 'number', label: 'Сила', amount: 3 },
      { kind: 'number', label: 'Мастерство', amount: 2 },
      { kind: 'number', label: 'Магия', amount: 1 },
    ]);
    // Вторая рука свободна — 1к10 двумя руками.
    expect(sword.damage).toEqual([
      {
        kind: 'dice',
        label: 'Длинный меч',
        count: 1,
        die: 10,
        sign: 1,
        type: 'slashing',
      },
      { kind: 'number', label: 'Сила', amount: 3, type: 'slashing' },
      { kind: 'number', label: 'Магия', amount: 1, type: 'slashing' },
    ]);
    expect(unarmed).toMatchObject({ key: 'unarmed', reach: 5, set: null });
    expect(unarmed.damage).toEqual([
      { kind: 'number', label: 'Удар', amount: 1, type: 'bludgeoning' },
      { kind: 'number', label: 'Сила', amount: 3, type: 'bludgeoning' },
    ]);
  });

  it('два кинжала: вторая рука — бонусным действием и без модификатора', () => {
    const attacks = heroAttacks(
      hero([
        row('Кинжал', weapon('dagger'), ['meleeMain']),
        row('Кинжал 2', weapon('dagger'), ['meleeOff']),
      ]),
    );
    const main = attacks.find((a) => a.key === 'meleeMain')!;
    const off = attacks.find((a) => a.key === 'meleeOff')!;
    expect(main.light).toBe(true);
    expect(off).toMatchObject({ spend: 'bonus_action', unavailable: null });
    expect(off.damage.map((t) => t.label)).toEqual(['Кинжал 2']);
  });

  it('вторая рука не Лёгкая — атаки ею нет; дротик пока не бросить', () => {
    const attacks = heroAttacks(
      hero([
        row('Кинжал', weapon('dagger'), ['meleeMain']),
        row('Цеп', weapon('flail'), ['meleeOff']),
        row('Дротик', weapon('dart'), ['rangedMain']),
      ]),
    );
    expect(attacks.find((a) => a.key === 'meleeOff')!.unavailable).toBe(
      OFF_HAND_NOT_LIGHT,
    );
    expect(attacks.find((a) => a.key === 'rangedMain')!.unavailable).toBe(
      THROWN_LATER,
    );
  });

  it('длинный лук: дистанция боеприпасов, полосы дистанции', () => {
    const [bow] = heroAttacks(
      hero([row('Длинный лук', weapon('longbow'), ['rangedMain'])]),
    );
    expect(bow).toMatchObject({ kind: 'ranged', set: 'ranged', reach: null });
    expect(bow.range).toMatchObject({ normal: 150, long: 600 });
    expect(rangeBand(bow, 150)).toBe('normal');
    expect(rangeBand(bow, 155)).toBe('long');
    expect(rangeBand(bow, 605)).toBe('out');
    expect(attackReachText(bow)).toBe('150/600 фт.');
  });

  it('досягаемость алебарды — 10 фт.', () => {
    const [halberd] = heroAttacks(
      hero([row('Алебарда', weapon('halberd'), ['meleeMain'])]),
    );
    expect(halberd.reach).toBe(10);
    expect(rangeBand(halberd, 10)).toBe('normal');
    expect(rangeBand(halberd, 15)).toBe('out');
  });
});

describe('активный набор', () => {
  it('выбранный — как выбран; без выбора ближний, а без ближнего оружия — дальний', () => {
    const bowOnly = wornGear([
      row('Длинный лук', weapon('longbow'), ['rangedMain']),
    ]);
    expect(activeWeaponSet(null, bowOnly)).toBe('ranged');
    expect(activeWeaponSet('melee', bowOnly)).toBe('melee');
    expect(activeWeaponSet(null, wornGear([]))).toBe('melee');
  });
});
