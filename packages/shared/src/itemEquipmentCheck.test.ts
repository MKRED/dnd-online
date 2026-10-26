import { describe, expect, it } from 'vitest';
import { BOOK_ARMOR_STATS, BOOK_SHIELD } from './bookArmor.js';
import { BOOK_WEAPONS } from './bookWeapons.js';
import { BOOK_ARMOR, type WeaponItemDetails } from './itemEquipment.js';
import {
  armorDetailsProblem,
  equipmentRarityProblem,
  shieldDetailsProblem,
  clothingDetailsProblem,
  jewelryDetailsProblem,
  weaponDetailsProblem,
} from './itemEquipmentCheck.js';
import type { Weapon } from './weapons.js';

function fromBook(base: Weapon): WeaponItemDetails {
  const { weight: _w, cost: _c, ...stats } = BOOK_WEAPONS[base];
  return { base, ...stats, magicBonus: 0, attunement: false };
}

describe('образцы из книги', () => {
  it('38 видов оружия, у каждого вид из группы', () => {
    expect(Object.keys(BOOK_WEAPONS)).toHaveLength(38);
    expect(BOOK_WEAPONS.longsword).toMatchObject({
      weaponCategory: 'martial',
      attackType: 'melee',
      damage: { count: 1, die: 8, type: 'slashing' },
      versatile: { count: 1, die: 10 },
      mastery: 'sap',
    });
    expect(BOOK_WEAPONS.blowgun.damage).toEqual({
      count: 1,
      die: null,
      type: 'piercing',
    });
  });

  it('каждое оружие книги проходит проверку', () => {
    for (const base of Object.keys(BOOK_WEAPONS) as Weapon[])
      expect(weaponDetailsProblem(fromBook(base)), base).toBeNull();
  });

  it('каждый доспех книги и щит проходят проверку', () => {
    for (const base of BOOK_ARMOR) {
      const { weight: _w, cost: _c, ...stats } = BOOK_ARMOR_STATS[base];
      const details = { base, ...stats, magicBonus: 0, attunement: false };
      expect(armorDetailsProblem(details), base).toBeNull();
    }
    const shield = {
      armorClass: BOOK_SHIELD.armorClass,
      magicBonus: 1,
      attunement: false,
    };
    expect(shieldDetailsProblem(shield)).toBeNull();
  });
});

describe('weaponDetailsProblem', () => {
  const longsword = fromBook('longsword');

  it('своё оружие без образца', () => {
    expect(weaponDetailsProblem({ ...longsword, base: null })).toBeNull();
  });

  it('отклоняет лишний и пропущенный ключ', () => {
    expect(weaponDetailsProblem({ ...longsword, extra: 1 })).not.toBeNull();
    const { mastery: _m, ...noMastery } = longsword;
    expect(weaponDetailsProblem(noMastery)).not.toBeNull();
  });

  it('свойства — без повторов и по порядку', () => {
    const props = (properties: string[]) =>
      weaponDetailsProblem({ ...longsword, properties });
    expect(props(['finesse', 'light'])).toBeNull();
    expect(props(['light', 'finesse'])).toBe('Неизвестное свойство оружия');
    expect(props(['light', 'light'])).toBe('Неизвестное свойство оружия');
    expect(props(['silvered'])).toBe('Неизвестное свойство оружия');
  });

  it('дистанция кратна 5, наибольшая не меньше обычной', () => {
    const thrown = (normal: number, long: number) =>
      weaponDetailsProblem({ ...longsword, thrown: { normal, long } });
    expect(thrown(20, 60)).toBeNull();
    expect(thrown(20, 20)).toBeNull();
    expect(thrown(60, 20)).not.toBeNull();
    expect(thrown(22, 60)).not.toBeNull();
    expect(thrown(0, 60)).not.toBeNull();
  });

  it('боеприпас — с видом', () => {
    const bow = fromBook('longbow');
    expect(
      weaponDetailsProblem({
        ...bow,
        ammunition: { normal: 150, long: 600, kind: 'stone' },
      }),
    ).toBe('Выберите вид боеприпаса');
  });

  it('урон двумя руками — только кубиками', () => {
    expect(
      weaponDetailsProblem({
        ...longsword,
        versatile: { count: 1, die: null },
      }),
    ).not.toBeNull();
  });

  it('дополнительный урон — до двух частей', () => {
    const fire = { count: 2, die: 4, type: 'fire' };
    const necrotic = { count: 4, die: null, type: 'necrotic' };
    expect(
      weaponDetailsProblem({ ...longsword, extraDamage: [fire, necrotic] }),
    ).toBeNull();
    expect(
      weaponDetailsProblem({
        ...longsword,
        extraDamage: [fire, necrotic, fire],
      }),
    ).toMatch(/^Дополнительный урон — до 2 частей/);
    expect(
      weaponDetailsProblem({
        ...longsword,
        extraDamage: [{ ...fire, type: 'holy' }],
      }),
    ).not.toBeNull();
  });

  it('свойства стрельбы — только у дальнобойного, досягаемость — у рукопашного', () => {
    expect(
      weaponDetailsProblem({
        ...longsword,
        ammunition: { normal: 80, long: 320, kind: 'arrow' },
      }),
    ).toBe('Боеприпас и Перезарядка бывают только у дальнобойного оружия');
    expect(
      weaponDetailsProblem({ ...longsword, properties: ['loading'] }),
    ).toBe('Боеприпас и Перезарядка бывают только у дальнобойного оружия');
    expect(
      weaponDetailsProblem({ ...fromBook('longbow'), properties: ['reach'] }),
    ).toBe('Досягаемость и Универсальное бывают только у рукопашного оружия');
    // Метательное и Фехтовальное — у обоих видов, как у дротика.
    expect(weaponDetailsProblem(fromBook('dart'))).toBeNull();
  });

  it('бонус магии от 0 до 3', () => {
    expect(weaponDetailsProblem({ ...longsword, magicBonus: 3 })).toBeNull();
    expect(weaponDetailsProblem({ ...longsword, magicBonus: 4 })).toBe(
      'Бонус магии — от 0 до +3',
    );
  });
});

describe('доспех, одежда и украшения', () => {
  const plate = {
    base: 'plate',
    kind: 'heavy',
    armorClass: 18,
    strength: 15,
    stealthDisadvantage: true,
    magicBonus: 0,
    attunement: false,
  };

  it('требование Силы — число или пусто', () => {
    expect(armorDetailsProblem({ ...plate, strength: null })).toBeNull();
    expect(armorDetailsProblem({ ...plate, strength: 0 })).not.toBeNull();
  });

  it('неизвестный вид доспеха', () => {
    expect(armorDetailsProblem({ ...plate, kind: 'mithral' })).toBe(
      'Выберите вид доспеха: лёгкий, средний или тяжёлый',
    );
  });

  it('у одежды и украшений нет бонуса магии', () => {
    expect(
      jewelryDetailsProblem({ slot: 'ring', attunement: true }),
    ).toBeNull();
    expect(
      jewelryDetailsProblem({ slot: 'ring', attunement: true, magicBonus: 1 }),
    ).not.toBeNull();
    expect(
      clothingDetailsProblem({ slot: 'head', attunement: true, magicBonus: 1 }),
    ).not.toBeNull();
  });

  it('у одежды и украшений свои места', () => {
    expect(
      clothingDetailsProblem({ slot: 'cloak', attunement: false }),
    ).toBeNull();
    expect(clothingDetailsProblem({ slot: 'ring', attunement: false })).toBe(
      'Выберите место одежды: голова, плащ, тело, руки или ноги',
    );
    expect(jewelryDetailsProblem({ slot: 'feet', attunement: false })).toBe(
      'Выберите место украшения: амулет или кольцо',
    );
    expect(
      jewelryDetailsProblem({ slot: 'belt', attunement: false }),
    ).not.toBeNull();
  });
});

describe('equipmentRarityProblem', () => {
  it('магия только с редкостью', () => {
    const plain = { magicBonus: 0, attunement: false };
    expect(equipmentRarityProblem(plain, 'none')).toBeNull();
    expect(
      equipmentRarityProblem({ magicBonus: 1, attunement: false }, 'none'),
    ).not.toBeNull();
    expect(
      equipmentRarityProblem(
        { slot: 'ring', attunement: true } as never,
        'none',
      ),
    ).not.toBeNull();
    expect(
      equipmentRarityProblem({ magicBonus: 1, attunement: true }, 'rare'),
    ).toBeNull();
  });
});
