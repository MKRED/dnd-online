import { describe, expect, it } from 'vitest';
import { BOOK_ARMOR_STATS, BOOK_SHIELD } from './bookArmor.js';
import { BOOK_WEAPONS } from './bookWeapons.js';
import type { ArmorTraining } from './character.js';
import { itemEquip, type EquipSlot } from './equipment.js';
import { wornGear, type WornGear } from './gear.js';
import {
  armorSpeedPenalty,
  armorUntrainedWarning,
  gearArmorClass,
  shieldUntrainedWarning,
} from './gearArmorClass.js';
import { gearAttacks } from './gearAttacks.js';
import type { BookArmor } from './itemEquipment.js';
import type { ItemVariant } from './items.js';
import type { Weapon, WeaponProficiency } from './weapons.js';

// Строка инвентаря с предметом на местах куклы.
function row(
  name: string,
  variant: ItemVariant,
  equipped: EquipSlot[],
  attuned = false,
) {
  return {
    equipped,
    attuned,
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

const armor = (key: BookArmor, magicBonus = 0): ItemVariant => {
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
      magicBonus,
      attunement: false,
    },
  };
};
const shield = (magicBonus = 0): ItemVariant => ({
  category: 'shield',
  details: {
    armorClass: BOOK_SHIELD.armorClass,
    magicBonus,
    attunement: false,
  },
});
const weapon = (key: Weapon, magicBonus = 0): ItemVariant => {
  const { weight: _w, cost: _c, ...stats } = BOOK_WEAPONS[key];
  return {
    category: 'weapon',
    details: { ...stats, base: key, magicBonus, attunement: false },
  };
};

const scores = (strength: number, dexterity: number) => ({
  strength,
  dexterity,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
});

const ALL: ArmorTraining[] = ['light', 'medium', 'heavy', 'shield'];
const ac = (gear: WornGear, dexterity = 14, training = ALL) =>
  gearArmorClass(gear, { unarmored: 12, dexterity, training });

describe('wornGear', () => {
  it('раскладывает надетое: доспех, щит, оружие по порядку мест', () => {
    const gear = wornGear([
      row(
        'Кольцо',
        { category: 'jewelry', details: { slot: 'ring', attunement: false } },
        ['ring1'],
      ),
      row('Арбалеты', weapon('handCrossbow'), ['rangedMain', 'rangedOff']),
      row('Кольчуга', armor('chainMail'), ['body']),
      row('Щит', shield(), ['meleeOff']),
      row('Меч', weapon('longsword'), ['meleeMain']),
      row('Кинжал', weapon('dagger'), []),
    ]);
    expect(gear.armor?.name).toBe('Кольчуга');
    expect(gear.shield?.name).toBe('Щит');
    expect(gear.weapons.map((w) => [w.name, w.slot])).toEqual([
      ['Меч', 'meleeMain'],
      ['Арбалеты', 'rangedMain'],
      ['Арбалеты', 'rangedOff'],
    ]);
  });

  it('скрытый или удалённый предмет ничего не даёт', () => {
    expect(wornGear([{ equipped: [], item: null, attuned: false }])).toEqual({
      armor: null,
      shield: null,
      weapons: [],
    });
  });
});

describe('gearArmorClass', () => {
  const gear = (...rows: ReturnType<typeof row>[]) => wornGear(rows);

  it('без надетого — число формы', () => {
    expect(ac(gear())).toEqual({
      armorClass: 12,
      wearsArmor: false,
      shieldBonus: 0,
      lines: [],
      warnings: [],
      unattuned: [],
    });
  });

  it('Ловкость по виду доспеха: полностью, не больше 2, нисколько', () => {
    expect(
      ac(gear(row('Кожа', armor('leather'), ['body'])), 18).armorClass,
    ).toBe(15);
    const medium = ac(gear(row('Кираса', armor('breastplate'), ['body'])), 18);
    expect(medium.armorClass).toBe(16);
    expect(medium.lines).toEqual([
      { text: 'Кираса', value: '14' },
      { text: 'Ловкость (не больше +2)', value: '+2' },
    ]);
    const heavy = ac(gear(row('Латы', armor('plate'), ['body'])), 18);
    expect(heavy.armorClass).toBe(18);
    expect(heavy.lines).toEqual([{ text: 'Латы', value: '18' }]);
  });

  it('отрицательная Ловкость вычитается и у среднего доспеха', () => {
    expect(ac(gear(row('Шкура', armor('hide'), ['body'])), 8).armorClass).toBe(
      11,
    );
  });

  it('щит и бонус магии прибавляются, щит без доспеха — к числу формы', () => {
    const full = ac(
      gear(
        row('Кольчуга +1', armor('chainMail', 1), ['body']),
        row('Щит +2', shield(2), ['meleeOff']),
      ),
    );
    expect(full.armorClass).toBe(21);
    expect(full.lines).toEqual([
      { text: 'Кольчуга +1', value: '17' },
      { text: 'Щит +2', value: '+4' },
    ]);
    const bare = ac(gear(row('Щит', shield(), ['meleeOff'])));
    expect(bare).toMatchObject({ armorClass: 14, wearsArmor: false });
    expect(bare.lines[0]).toEqual({ text: 'Без доспеха', value: '12' });
  });

  it('без тренированности: доспех КД даёт с предупреждением, щит — не даёт', () => {
    const result = ac(
      gear(
        row('Кольчуга', armor('chainMail'), ['body']),
        row('Щит', shield(), ['meleeOff']),
      ),
      14,
      ['light'],
    );
    expect(result.armorClass).toBe(16);
    expect(result.warnings).toEqual([
      armorUntrainedWarning('Кольчуга'),
      shieldUntrainedWarning('Щит'),
    ]);
  });

  it('Скорость снижает доспех с Силой выше, чем у персонажа', () => {
    const plate = gear(row('Латы', armor('plate'), ['body']));
    expect(armorSpeedPenalty(plate, 13)).toEqual({
      name: 'Латы',
      strength: 15,
    });
    expect(armorSpeedPenalty(plate, 15)).toBeNull();
    expect(
      armorSpeedPenalty(gear(row('Кираса', armor('breastplate'), ['body'])), 3),
    ).toBeNull();
  });
});

describe('gearAttacks', () => {
  const input = (
    strength: number,
    dexterity: number,
    weapons: WeaponProficiency[] = ['martial', 'simple'],
  ) => ({
    abilityScores: scores(strength, dexterity),
    proficiencyBonus: 2,
    weapons: [...weapons],
  });

  it('рукопашное — Сила, дальнобойное — Ловкость, с мастерством и магией', () => {
    const [sword, bow] = gearAttacks(
      wornGear([
        row('Меч +1', weapon('longsword', 1), ['meleeMain']),
        row('Лук', weapon('longbow'), ['rangedMain']),
      ]),
      input(16, 12),
    );
    expect(sword).toMatchObject({
      ability: 'strength',
      attackBonus: 6,
      damageBonus: 4,
      proficient: true,
    });
    expect(sword.attackParts).toEqual([
      { text: 'Сила', value: '+3' },
      { text: 'Мастерство', value: '+2' },
      { text: 'Магия', value: '+1' },
    ]);
    // Вторая рука свободна — Универсальное бьёт и двумя руками.
    expect(sword.twoHanded).toEqual({ count: 1, die: 10 });
    expect(bow).toMatchObject({
      ability: 'dexterity',
      attackBonus: 3,
      damageBonus: 1,
      heavyDisadvantage: true,
    });
  });

  it('Фехтовальное — большее из Силы и Ловкости; без владения мастерство не прибавляется', () => {
    const [rapier] = gearAttacks(
      wornGear([row('Рапира', weapon('rapier'), ['meleeMain'])]),
      input(10, 16, ['simple']),
    );
    expect(rapier).toMatchObject({
      ability: 'dexterity',
      attackBonus: 3,
      proficient: false,
    });
  });

  it('владение отдельным видом оружия', () => {
    const [whip] = gearAttacks(
      wornGear([row('Кнут', weapon('whip'), ['meleeMain'])]),
      input(10, 10, ['whip']),
    );
    expect(whip.proficient).toBe(true);
  });

  it('Лёгкое во второй руке — доп. атака без модификатора к урону', () => {
    const attacks = gearAttacks(
      wornGear([
        row('Арбалеты', weapon('handCrossbow'), ['rangedMain', 'rangedOff']),
      ]),
      input(10, 14),
    );
    expect(attacks.map((a) => [a.lightBonus, a.damageBonus])).toEqual([
      [false, 2],
      [true, 0],
    ]);
  });

  it('щит занимает вторую руку: Универсальное — одной рукой', () => {
    const [sword] = gearAttacks(
      wornGear([
        row('Меч', weapon('longsword'), ['meleeMain']),
        row('Щит', shield(), ['meleeOff']),
      ]),
      input(16, 12),
    );
    expect(sword.twoHanded).toBeNull();
  });
});
