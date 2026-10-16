import { describe, expect, it } from 'vitest';
import type { items } from '../database/schema/index.js';
import type { ItemDto } from './dto/item.dto.js';
import {
  packContentsOf,
  publicationOf,
  toItem,
  toItemValues,
} from './items.mapper.js';

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
  sources: [],
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
      ownerId: 'i1',
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

  it('отдаёт состав набора из своей таблицы', () => {
    const pack = { ...row, category: 'pack' as const };
    const contents = [{ itemId: 'i2', quantity: 10, item: null }];
    expect(toItem(pack, 'Арвен', null, contents).details).toEqual({ contents });
    expect(toItem(pack, 'Арвен').details).toEqual({ contents: [] });
  });

  it('у набора details в базе пустой, состав — отдельно', () => {
    const dto = {
      name: 'Набор путешественника',
      category: 'pack',
      rarity: 'none',
      details: { contents: [{ itemId: 'i2', quantity: 10 }] },
      weight: 55,
      isPublic: false,
    } as ItemDto;
    expect(toItemValues(dto).details).toEqual({});
    expect(packContentsOf(dto)).toEqual([{ itemId: 'i2', quantity: 10 }]);
    expect(packContentsOf({ ...dto, category: 'basic' })).toBeNull();
  });

  it('публикация состава — только по флагу запроса', () => {
    const dto = { isPublic: true } as ItemDto;
    expect(publicationOf(dto)).toEqual({
      isPublic: true,
      publishContents: false,
    });
    expect(publicationOf({ ...dto, publishContents: true })).toEqual({
      isPublic: true,
      publishContents: true,
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
      sources: [],
    });
  });
});
