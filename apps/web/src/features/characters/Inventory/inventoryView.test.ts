import type { InventoryEntry, Item } from 'shared';
import { describe, expect, it } from 'vitest';
import {
  byLocation,
  entryName,
  entryWeight,
  inventoryCandidates,
} from './inventoryView';

function entry(
  patch: Partial<InventoryEntry> & { weight?: number } = {},
): InventoryEntry {
  const { weight = 1, ...rest } = patch;
  return {
    id: 'e',
    location: 'carried',
    quantity: 1,
    item: {
      id: 'i',
      name: 'Факел',
      category: 'basic',
      rarity: 'none',
      weight,
      isPublic: true,
      image: null,
    },
    missing: null,
    ...rest,
  } as InventoryEntry;
}

describe('inventoryView', () => {
  it('делит строки по месту', () => {
    const list = [entry({ id: 'a' }), entry({ id: 'b', location: 'stash' })];
    expect(byLocation(list, 'stash').map((e) => e.id)).toEqual(['b']);
  });

  it('вес строки — вес × количество без ошибки дробей', () => {
    expect(entryWeight(entry({ weight: 0.1, quantity: 3 }))).toBe(0.3);
    expect(entryWeight(entry({ item: null, missing: 'hidden' }))).toBe(0);
  });

  it('называет скрытые и удалённые строки', () => {
    expect(entryName(entry())).toBe('Факел');
    expect(entryName(entry({ item: null, missing: 'hidden' }))).toBe(
      'Предмет скрыт автором',
    );
    expect(entryName(entry({ item: null, missing: 'deleted' }))).toBe(
      'Предмет удалён автором',
    );
  });

  it('кандидаты: свои все, чужие из каталога без своих, по алфавиту', () => {
    const item = (id: string, name: string, authorId: string) =>
      ({ id, name, authorId }) as Item;
    const mine = [item('2', 'Факел', 'me'), item('1', 'Верёвка', 'me')];
    const catalog = [item('1', 'Верёвка', 'me'), item('3', 'Арбалет', 'x')];
    const result = inventoryCandidates(mine, catalog, 'me');
    expect(result.mine.map((i) => i.name)).toEqual(['Верёвка', 'Факел']);
    expect(result.others.map((i) => i.id)).toEqual(['3']);
  });
});
