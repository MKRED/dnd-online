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
  attuned: false,
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
    sources: [],
    isPublic: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...patch,
  };
}

describe('toInventoryEntry', () => {
  it('опубликованный предмет — с карточкой', () => {
    expect(toInventoryEntry(entry, item(), null, 'viewer', 'owner')).toEqual({
      id: 'e1',
      location: 'carried',
      quantity: 2,
      equipped: [],
      attuned: false,
      missing: null,
      inactive: false,
      item: {
        id: 'i1',
        name: 'Верёвка',
        category: 'basic',
        rarity: 'none',
        weight: 5,
        isPublic: true,
        image: null,
        equip: null,
      },
    });
  });

  it('свой скрытый предмет автор видит', () => {
    const result = toInventoryEntry(
      entry,
      item({ isPublic: false }),
      null,
      'author',
      'author',
    );
    expect(result.item?.isPublic).toBe(false);
  });

  // Ни названия, ни веса, ни id: решено с пользователем.
  it('чужой скрытый — строка без карточки', () => {
    expect(
      toInventoryEntry(
        entry,
        item({ isPublic: false }),
        null,
        'viewer',
        'owner',
      ),
    ).toEqual({
      id: 'e1',
      location: 'carried',
      quantity: 2,
      equipped: [],
      attuned: false,
      item: null,
      missing: 'hidden',
    });
  });

  // Автор скрытого предмета смотрит на чужой лист: свою карточку видит, но предмет на
  // персонажа не действует.
  it('скрытый от владельца — автору с карточкой, но не действует', () => {
    expect(
      toInventoryEntry(
        entry,
        item({ isPublic: false }),
        null,
        'author',
        'owner',
      ),
    ).toMatchObject({ item: { id: 'i1' }, missing: null, inactive: true });
  });

  it('удалённый автором — строка без карточки', () => {
    expect(
      toInventoryEntry(
        { ...entry, itemId: null },
        null,
        null,
        'viewer',
        'owner',
      ),
    ).toMatchObject({ item: null, missing: 'deleted' });
  });

  describe('надетое и настройка', () => {
    const ring = item({
      name: 'Кольцо защиты',
      category: 'jewelry',
      rarity: 'rare',
      details: { slot: 'ring', attunement: true },
    });
    const attuned = { ...entry, attuned: true };

    it('места, куда предмет подходит, и настройка', () => {
      expect(
        toInventoryEntry(attuned, ring, null, 'owner', 'owner', ['ring2']),
      ).toMatchObject({ equipped: ['ring2'], attuned: true });
    });

    // Автор поменял предмет после того, как его надели: место пусто, настройки нет.
    it('место, куда предмет уже не подходит, и лишняя настройка пропадают', () => {
      const cloak = item({
        category: 'clothing',
        details: { slot: 'cloak', attunement: false },
      });
      expect(
        toInventoryEntry(attuned, cloak, null, 'owner', 'owner', ['ring2']),
      ).toMatchObject({ equipped: [], attuned: false });
    });

    it('скрытый от владельца предмет не надет', () => {
      expect(
        toInventoryEntry(
          attuned,
          { ...ring, isPublic: false },
          null,
          'author',
          'owner',
          ['ring1'],
        ),
      ).toMatchObject({ equipped: [], attuned: false, inactive: true });
    });
  });
});
