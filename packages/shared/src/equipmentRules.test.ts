import { describe, expect, it } from 'vitest';
import { itemEquip, type ItemEquip } from './equipment.js';
import {
  ATTUNE_COPY,
  ATTUNE_FULL,
  ATTUNE_NOT_CARRIED,
  ATTUNE_NOT_NEEDED,
  EQUIP_HANDS_BUSY,
  EQUIP_NOT_CARRIED,
  EQUIP_NOT_EQUIPMENT,
  EQUIP_WRONG_SLOT,
  attuneProblem,
  equipAllWorn,
  planEquip,
  slotsToPrune,
  type AttuneCandidate,
  type EquipCandidate,
  type WornItem,
} from './equipmentRules.js';
import type { WeaponItemDetails } from './itemEquipment.js';

const weapon = (over: Partial<WeaponItemDetails> = {}) =>
  itemEquip({
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
      ...over,
    },
  });

const ring = (attunement = false) =>
  itemEquip({ category: 'jewelry', details: { slot: 'ring', attunement } });

function entry(
  equip: ItemEquip | null,
  over: Partial<EquipCandidate> = {},
): EquipCandidate {
  return { id: 'e', location: 'carried', quantity: 1, equip, ...over };
}

const worn = (over: Partial<WornItem> & Pick<WornItem, 'slot'>): WornItem => ({
  entryId: 'other',
  twoHanded: false,
  ...over,
});

describe('itemEquip', () => {
  it('раскладывает категории по местам', () => {
    expect(weapon()?.slots).toEqual(['meleeMain', 'meleeOff']);
    expect(weapon({ attackType: 'ranged' })?.slots).toEqual([
      'rangedMain',
      'rangedOff',
    ]);
    expect(ring()?.slots).toEqual(['ring1', 'ring2']);
    expect(
      itemEquip({
        category: 'shield',
        details: { armorClass: 2, magicBonus: 0, attunement: false },
      })?.slots,
    ).toEqual(['meleeOff']);
    expect(
      itemEquip({ category: 'basic', details: {} as Record<string, never> }),
    ).toBeNull();
  });

  it('двуручное — только в основную руку', () => {
    expect(weapon({ properties: ['twoHanded'] })).toEqual({
      slots: ['meleeMain'],
      twoHanded: true,
      attunement: false,
    });
  });
});

describe('planEquip', () => {
  it('надевает на свободное место', () => {
    expect(planEquip([], entry(weapon()), 'meleeMain')).toEqual({
      freed: [],
    });
  });

  it('отказывает не экипировке, вещи из хранилища и чужому месту', () => {
    expect(planEquip([], entry(null), 'head')).toEqual({
      error: EQUIP_NOT_EQUIPMENT,
    });
    expect(
      planEquip([], entry(weapon(), { location: 'stash' }), 'meleeMain'),
    ).toEqual({ error: EQUIP_NOT_CARRIED });
    expect(planEquip([], entry(weapon()), 'rangedMain')).toEqual({
      error: EQUIP_WRONG_SLOT,
    });
  });

  it('двуручное снимает вторую руку своего набора', () => {
    const shield = worn({ slot: 'meleeOff' });
    const bow = worn({ slot: 'rangedOff' });
    expect(
      planEquip(
        [shield, bow],
        entry(weapon({ properties: ['twoHanded'] })),
        'meleeMain',
      ),
    ).toEqual({ freed: ['meleeOff'] });
  });

  it('во вторую руку нельзя, пока в основной двуручное', () => {
    const greatsword = worn({ slot: 'meleeMain', twoHanded: true });
    expect(planEquip([greatsword], entry(weapon()), 'meleeOff')).toEqual({
      error: EQUIP_HANDS_BUSY,
    });
  });

  it('единственная вещь переезжает, а стопка держится в двух местах', () => {
    const inMain = worn({ slot: 'meleeMain', entryId: 'e' });
    expect(planEquip([inMain], entry(weapon()), 'meleeOff')).toEqual({
      freed: ['meleeMain'],
    });
    expect(
      planEquip([inMain], entry(weapon(), { quantity: 2 }), 'meleeOff'),
    ).toEqual({ freed: [] });
    const twoRings = entry(ring(), { quantity: 2 });
    expect(
      planEquip(
        [worn({ slot: 'ring1', entryId: 'e' }), worn({ slot: 'ring2' })],
        twoRings,
        'ring2',
      ),
    ).toEqual({ freed: [] });
  });

  it('стопку не надеть больше, чем её количество', () => {
    const rings = [
      worn({ slot: 'ring1', entryId: 'e' }),
      worn({ slot: 'ring2', entryId: 'e' }),
    ];
    // Третьего места для кольца на кукле нет — правило проверяем на вымышленном месте.
    expect(
      planEquip(
        rings,
        entry(
          {
            slots: ['ring1', 'ring2', 'amulet'],
            twoHanded: false,
            attunement: false,
          },
          { quantity: 2 },
        ),
        'amulet',
      ),
    ).toEqual({ error: equipAllWorn(2) });
  });
});

describe('attuneProblem', () => {
  const candidate = (over: Partial<AttuneCandidate> = {}): AttuneCandidate => ({
    ...entry(ring(true)),
    itemId: 'ring',
    attuned: false,
    ...over,
  });

  it('настраивает на требующий настройки предмет при себе', () => {
    expect(attuneProblem([], candidate())).toBeNull();
    expect(attuneProblem([], candidate({ equip: ring() }))).toBe(
      ATTUNE_NOT_NEEDED,
    );
    expect(attuneProblem([], candidate({ location: 'stash' }))).toBe(
      ATTUNE_NOT_CARRIED,
    );
  });

  it('не больше трёх и не на две копии одного предмета', () => {
    const attuned = (id: string) =>
      candidate({ id, itemId: id, attuned: true });
    const three = [attuned('a'), attuned('b'), attuned('c')];
    expect(attuneProblem(three, candidate())).toBe(ATTUNE_FULL);
    // Уже настроенная строка сама себя не считает.
    expect(attuneProblem(three, three[0])).toBeNull();
    const copy = candidate({ id: 'stash-copy', attuned: true });
    expect(attuneProblem([copy], candidate())).toBe(ATTUNE_COPY);
  });
});

describe('slotsToPrune', () => {
  it('снимает вещи из хранилища, удалённые и лишние сверх количества', () => {
    const worn = [
      { slot: 'meleeOff' as const, entryId: 'dagger' },
      { slot: 'meleeMain' as const, entryId: 'dagger' },
      { slot: 'body' as const, entryId: 'armor' },
      { slot: 'ring1' as const, entryId: 'gone' },
    ];
    expect(
      slotsToPrune(worn, [
        { id: 'dagger', location: 'carried', quantity: 1 },
        { id: 'armor', location: 'stash', quantity: 1 },
      ]),
    ).toEqual(['body', 'ring1', 'meleeOff']);
  });
});
