import {
  BOOK_ARMOR,
  BOOK_WEAPONS,
  armorDetailsProblem,
  weaponDetailsProblem,
  type Item,
  type Weapon,
} from 'shared';
import { describe, expect, it } from 'vitest';
import { toFormValues, toItemInput } from '../itemFormValues';
import { armorBookDifferences, armorFromBook } from './equipmentFormValues';
import {
  weaponBookDifferences,
  weaponFromBook,
  weaponToDetails,
} from './weaponFormValues';

describe('образцы в форме', () => {
  it('любое оружие книги после формы проходит проверку сервера', () => {
    for (const base of Object.keys(BOOK_WEAPONS) as Weapon[]) {
      const details = {
        ...weaponToDetails(weaponFromBook(base)),
        magicBonus: 0,
        attunement: false,
      };
      expect(weaponDetailsProblem(details), base).toBeNull();
      expect(weaponBookDifferences(weaponFromBook(base)), base).toEqual([]);
    }
  });

  it('любой доспех книги без отличий и проходит проверку', () => {
    for (const base of BOOK_ARMOR) {
      expect(armorBookDifferences(armorFromBook(base)), base).toEqual([]);
      const values = { ...toFormValues(null), category: 'armor' as const };
      const input = toItemInput({ ...values, armor: armorFromBook(base) });
      expect(armorDetailsProblem(input.details), base).toBeNull();
    }
  });

  it('называет, чем оружие отличается от книги', () => {
    const sword = weaponFromBook('longsword');
    expect(
      weaponBookDifferences({
        ...sword,
        damageDie: '10',
        properties: ['finesse', 'versatile'],
      }),
    ).toEqual(['урон', 'свойства']);
    expect(
      weaponBookDifferences({
        ...sword,
        extraDamage: [{ count: 2, die: '4', type: 'fire' }],
      }),
    ).toEqual(['урон']);
  });
});

describe('оружие в запросе', () => {
  it('дополнительный урон уходит частями, число — без кубика', () => {
    const details = weaponToDetails({
      ...weaponFromBook('longsword'),
      extraDamage: [
        { count: 2, die: '4', type: 'fire' },
        { count: '4', die: 'flat', type: 'necrotic' },
      ],
    });
    expect(details.extraDamage).toEqual([
      { count: 2, die: 4, type: 'fire' },
      { count: 4, die: null, type: 'necrotic' },
    ]);
  });

  it('свойства другого вида атаки не уходят: у лука нет Досягаемости', () => {
    const bow = weaponFromBook('longbow');
    const details = weaponToDetails({
      ...bow,
      properties: [...bow.properties, 'reach', 'versatile'],
    });
    expect(details.properties).toEqual(['heavy', 'twoHanded']);
    expect(details.versatile).toBeNull();
    const asMelee = weaponToDetails({ ...bow, attackType: 'melee' });
    expect(asMelee.ammunition).toBeNull();
    expect(
      weaponDetailsProblem({ ...asMelee, magicBonus: 0, attunement: false }),
    ).toBeNull();
  });
});

describe('экипировка в запросе', () => {
  it('у немагического предмета бонус и настройка уходят пустыми', () => {
    const values = {
      ...toFormValues(null),
      name: 'Меч',
      category: 'weapon' as const,
      weapon: weaponFromBook('longsword'),
      magicBonus: '2',
      attunement: true,
    };
    expect(toItemInput(values).details).toMatchObject({
      magicBonus: 0,
      attunement: false,
    });
    expect(toItemInput({ ...values, rarity: 'rare' }).details).toMatchObject({
      magicBonus: 2,
      attunement: true,
    });
  });

  it('предмет из базы читается в форму и уходит тем же', () => {
    const ring = {
      category: 'jewelry',
      rarity: 'rare',
      details: { slot: 'ring', attunement: true },
    } as Item;
    const values = { ...toFormValues(ring), name: 'Кольцо' };
    expect(values.jewelrySlot).toBe('ring');
    expect(values.clothingSlot).toBeNull();
    expect(toItemInput(values)).toMatchObject({
      category: 'jewelry',
      details: { slot: 'ring', attunement: true },
    });
    const bow = {
      category: 'weapon',
      rarity: 'none',
      details: {
        ...weaponToDetails(weaponFromBook('longbow')),
        magicBonus: 0,
        attunement: false,
      },
    } as Item;
    expect(toItemInput({ ...toFormValues(bow), name: 'Лук' }).details).toEqual(
      bow.details,
    );
  });
});
