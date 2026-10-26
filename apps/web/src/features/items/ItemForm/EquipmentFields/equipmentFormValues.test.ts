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
      category: 'wearable',
      rarity: 'rare',
      details: { slot: 'ring', attunement: true },
    } as Item;
    const values = { ...toFormValues(ring), name: 'Кольцо' };
    expect(values.wearableSlot).toBe('ring');
    expect(toItemInput(values)).toMatchObject({
      category: 'wearable',
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
