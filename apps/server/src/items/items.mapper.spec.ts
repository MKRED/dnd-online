import { describe, expect, it } from 'vitest';
import type { items } from '../database/schema/index.js';
import type { ItemDto } from './dto/item.dto.js';
import { toItem, toItemValues } from './items.mapper.js';

const row: typeof items.$inferSelect = {
  id: 'i1',
  authorId: 'u1',
  isPublic: true,
  name: 'Зеркало',
  category: 'basic',
  rarity: 'none',
  details: {},
  weight: 0.5,
  costAmount: 5,
  costCoin: 'gp',
  description: '',
  createdAt: new Date('2026-10-14T10:00:00Z'),
  updatedAt: new Date('2026-10-14T11:00:00Z'),
};

describe('items.mapper', () => {
  it('собирает стоимость из двух колонок', () => {
    expect(toItem(row, 'Арвен')).toMatchObject({
      authorNickname: 'Арвен',
      weight: 0.5,
      cost: { amount: 5, coin: 'gp' },
      updatedAt: '2026-10-14T11:00:00.000Z',
    });
    expect(
      toItem({ ...row, costAmount: null, costCoin: null }, 'Арвен').cost,
    ).toBeNull();
  });

  it('снятая цена и описание пишутся как null и пустая строка', () => {
    const dto = {
      name: 'Сюжетный ключ',
      category: 'basic',
      rarity: 'uncommon',
      details: {},
      weight: 0,
      isPublic: false,
    } as ItemDto;
    expect(toItemValues(dto)).toMatchObject({
      costAmount: null,
      costCoin: null,
      description: '',
    });
  });
});
