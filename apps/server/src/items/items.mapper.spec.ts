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

  it('отдаёт метаданные картинки или null', () => {
    expect(toItem(row, 'Арвен').image).toBeNull();
    const image = {
      itemId: 'i1',
      width: 800,
      height: 200,
      thumbCrop: { x: 0, y: -300, size: 800 },
      version: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(toItem(row, 'Арвен', image).image).toEqual({
      version: 3,
      width: 800,
      height: 200,
      thumbCrop: { x: 0, y: -300, size: 800 },
    });
  });

  it('отдаёт насыщение еды; старая еда без него — насыщение 0', () => {
    const food = { ...row, category: 'food' as const };
    expect(
      toItem({ ...food, details: { satiety: 20 } }, 'Арвен'),
    ).toMatchObject({ category: 'food', details: { satiety: 20 } });
    expect(toItem({ ...food, details: {} }, 'Арвен').details).toEqual({
      satiety: 0,
    });
  });

  it('отдаёт вид сокровища; неизвестный вид читается как товар', () => {
    const treasure = { ...row, category: 'treasure' as const };
    expect(
      toItem({ ...treasure, details: { kind: 'gem' } }, 'Арвен'),
    ).toMatchObject({ category: 'treasure', details: { kind: 'gem' } });
    expect(toItem({ ...treasure, details: {} }, 'Арвен').details).toEqual({
      kind: 'trade_good',
    });
  });

  it('отдаёт груз контейнера; без числа — груз не указан', () => {
    const container = { ...row, category: 'container' as const };
    expect(
      toItem({ ...container, details: { capacity: 30 } }, 'Арвен').details,
    ).toEqual({ capacity: 30 });
    expect(toItem({ ...container, details: {} }, 'Арвен').details).toEqual({
      capacity: null,
    });
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
