import { describe, expect, it } from 'vitest';
import { carriedLoad, carryingCapacity } from './carrying.js';
import type { InventoryEntry, InventoryItemCard } from './inventory.js';

function card(weight: number): InventoryItemCard {
  return {
    id: 'i',
    name: 'Предмет',
    category: 'basic',
    rarity: 'none',
    weight,
    isPublic: true,
    image: null,
    equip: null,
  };
}

function entry(
  weight: number,
  quantity: number,
  location: InventoryEntry['location'] = 'carried',
): Extract<InventoryEntry, { missing: null }> {
  return {
    id: 'e',
    location,
    quantity,
    equipped: [],
    attuned: false,
    item: card(weight),
    missing: null,
    inactive: false,
  };
}

describe('carryingCapacity', () => {
  it('Сила × 15 нести и × 30 тащить', () => {
    expect(carryingCapacity(10)).toEqual({ carry: 150, dragLiftPush: 300 });
    expect(carryingCapacity(17)).toEqual({ carry: 255, dragLiftPush: 510 });
  });
});

describe('carriedLoad', () => {
  it('складывает вес × количество при себе', () => {
    expect(carriedLoad([entry(5, 2), entry(0.25, 3)])).toEqual({
      weight: 10.75,
      excluded: 0,
    });
  });

  it('не набирает ошибку дробей', () => {
    expect(carriedLoad([entry(0.1, 3)]).weight).toBe(0.3);
  });

  it('хранилище в груз не входит', () => {
    expect(carriedLoad([entry(5, 1), entry(100, 1, 'stash')]).weight).toBe(5);
  });

  it('скрытые и удалённые не входят, но считаются при себе', () => {
    const hidden: InventoryEntry = {
      id: 'h',
      location: 'carried',
      quantity: 4,
      equipped: [],
      attuned: false,
      item: null,
      missing: 'hidden',
    };
    const deletedInStash: InventoryEntry = {
      id: 'd',
      location: 'stash',
      quantity: 1,
      equipped: [],
      attuned: false,
      item: null,
      missing: 'deleted',
    };
    expect(carriedLoad([entry(2, 1), hidden, deletedInStash])).toEqual({
      weight: 2,
      excluded: 1,
    });
  });

  it('не действующий на персонажа не входит', () => {
    expect(
      carriedLoad([entry(2, 1), { ...entry(50, 1), inactive: true }]),
    ).toEqual({ weight: 2, excluded: 1 });
  });

  it('пустой инвентарь — ноль', () => {
    expect(carriedLoad([])).toEqual({ weight: 0, excluded: 0 });
  });
});
