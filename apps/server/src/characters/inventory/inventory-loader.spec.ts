import { describe, expect, it } from 'vitest';
import type { characterItems, items } from '../../database/schema/index.js';
import { toInventoryEntry } from './inventory-loader.js';

type EntryRow = typeof characterItems.$inferSelect;
type ItemRow = typeof items.$inferSelect;

const entry: EntryRow = {
  id: 'e1',
  characterId: 'c1',
  itemId: 'i1',
  location: 'carried',
  quantity: 2,
  addedAt: new Date('2026-10-15T00:00:00Z'),
};

function item(patch: Partial<ItemRow> = {}): ItemRow {
  return {
    id: 'i1',
    authorId: 'author',
    name: 'Верёвка',
    category: 'basic',
    rarity: 'none',
    details: {},
    weight: 5,
    costAmount: 1,
    costCoin: 'gp',
    description: '',
    isPublic: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...patch,
  };
}

describe('toInventoryEntry', () => {
  it('опубликованный предмет — с карточкой', () => {
    expect(toInventoryEntry(entry, item(), null, 'viewer')).toEqual({
      id: 'e1',
      location: 'carried',
      quantity: 2,
      missing: null,
      item: {
        id: 'i1',
        name: 'Верёвка',
        category: 'basic',
        rarity: 'none',
        weight: 5,
        isPublic: true,
        image: null,
      },
    });
  });

  it('свой скрытый предмет автор видит', () => {
    const result = toInventoryEntry(
      entry,
      item({ isPublic: false }),
      null,
      'author',
    );
    expect(result.item?.isPublic).toBe(false);
  });

  // Ни названия, ни веса, ни id: решено с пользователем.
  it('чужой скрытый — строка без карточки', () => {
    expect(
      toInventoryEntry(entry, item({ isPublic: false }), null, 'viewer'),
    ).toEqual({
      id: 'e1',
      location: 'carried',
      quantity: 2,
      item: null,
      missing: 'hidden',
    });
  });

  it('удалённый автором — строка без карточки', () => {
    expect(
      toInventoryEntry({ ...entry, itemId: null }, null, null, 'viewer'),
    ).toMatchObject({ item: null, missing: 'deleted' });
  });
});
