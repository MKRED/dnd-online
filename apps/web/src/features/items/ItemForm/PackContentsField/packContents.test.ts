import type { Item, PackEntry } from 'shared';
import { describe, expect, it } from 'vitest';
import { addPackEntry, packCandidates, packWeight } from './packContents';

const item = (id: string, extra: Partial<Item> = {}): Item =>
  ({
    id,
    authorId: 'u1',
    authorNickname: 'Арвен',
    isPublic: false,
    name: id,
    category: 'basic',
    details: {},
    rarity: 'none',
    weight: 1,
    cost: null,
    description: '',
    image: null,
    createdAt: '',
    updatedAt: '',
    ...extra,
  }) as Item;

describe('addPackEntry', () => {
  it('добавляет новый предмет строкой с количеством 1', () => {
    expect(addPackEntry([], item('Факел'))).toEqual([
      {
        itemId: 'Факел',
        quantity: 1,
        item: {
          name: 'Факел',
          category: 'basic',
          weight: 1,
          isPublic: false,
          image: null,
        },
      },
    ]);
  });

  it('повторный выбор увеличивает количество, но не больше 1000', () => {
    const once = addPackEntry([], item('Факел'));
    expect(addPackEntry(once, item('Факел'))[0].quantity).toBe(2);
    const full = [{ ...once[0], quantity: 1000 }];
    expect(addPackEntry(full, item('Факел'))[0].quantity).toBe(1000);
  });
});

describe('packWeight', () => {
  const entry = (weight: number, quantity: number): PackEntry => ({
    itemId: String(weight),
    quantity,
    item: { name: '', category: 'basic', weight, isPublic: true, image: null },
  });

  it('суммирует вес × количество до сотых', () => {
    expect(packWeight([entry(0.1, 3), entry(5, 1)])).toEqual({
      total: 5.3,
      partial: false,
    });
  });

  it('скрытые строки не входят в сумму и делают её нижней границей', () => {
    expect(
      packWeight([entry(5, 1), { itemId: 'x', quantity: 2, item: null }]),
    ).toEqual({ total: 5, partial: true });
  });
});

describe('packCandidates', () => {
  it('свои — из «Моих», чужие — из каталога, без наборов и себя, по алфавиту', () => {
    const mine = [
      item('Факел'),
      item('Набор', { category: 'pack' }),
      item('Сам предмет'),
    ];
    const catalog = [
      item('Факел', { isPublic: true }),
      item('Верёвка', { authorId: 'u2', isPublic: true }),
      item('Бурдюк', { authorId: 'u2', isPublic: true }),
    ];
    const { mine: own, others } = packCandidates(
      mine,
      catalog,
      'u1',
      'Сам предмет',
    );
    expect(own.map((i) => i.name)).toEqual(['Факел']);
    expect(others.map((i) => i.name)).toEqual(['Бурдюк', 'Верёвка']);
  });
});
