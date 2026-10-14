// @Type в DTO читает метаданные типов — без полифила файл не загружается вне Nest.
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { ItemDto } from './item.dto.js';

const valid = {
  name: 'Верёвка',
  category: 'basic',
  rarity: 'none',
  details: {},
  weight: 5,
  cost: { amount: 1, coin: 'gp' },
  description: 'Пеньковая, 50 футов',
  isPublic: false,
};

// Ошибки по полям; у вложенной стоимости они лежат в children.
async function errorsOf(overrides: object): Promise<Record<string, string[]>> {
  const errors = await validate(
    plainToInstance(ItemDto, { ...valid, ...overrides }),
  );
  return Object.fromEntries(
    errors.map((error) => [
      error.property,
      [error, ...(error.children ?? [])].flatMap((e) =>
        Object.values(e.constraints ?? {}),
      ),
    ]),
  );
}

describe('ItemDto', () => {
  it('принимает базовый предмет', async () => {
    expect(await errorsOf({})).toEqual({});
  });

  it('принимает предмет без цены и описания', async () => {
    expect(await errorsOf({ cost: null, description: undefined })).toEqual({});
  });

  it('принимает дробный вес до сотых и нулевой вес', async () => {
    expect(await errorsOf({ weight: 0.25 })).toEqual({});
    expect(await errorsOf({ weight: 0 })).toEqual({});
    expect(await errorsOf({ weight: 0.125 })).toHaveProperty('weight');
    expect(await errorsOf({ weight: -1 })).toHaveProperty('weight');
  });

  it('обрезает пробелы в названии и не принимает пустое', async () => {
    expect(await errorsOf({ name: '   ' })).toEqual({
      name: ['Название предмета — от 1 до 100 символов'],
    });
  });

  it('редкость обязательна и только из справочника', async () => {
    expect(await errorsOf({ rarity: 'very_rare' })).toEqual({});
    expect(await errorsOf({ rarity: 'Редкий' })).toEqual({
      rarity: ['Неизвестная редкость предмета'],
    });
    expect(await errorsOf({ rarity: undefined })).toHaveProperty('rarity');
  });

  it('отклоняет неизвестную категорию и монету', async () => {
    expect(await errorsOf({ category: 'weapon' })).toEqual({
      category: ['Неизвестная категория предмета'],
    });
    expect(await errorsOf({ cost: { amount: 1, coin: 'zm' } })).toEqual({
      cost: ['Неизвестная монета'],
    });
  });

  it.each(['material', 'quest'])(
    'принимает категорию %s с пустыми details и не пускает в них поля',
    async (category) => {
      expect(await errorsOf({ category })).toEqual({});
      expect(await errorsOf({ category, details: { portions: 3 } })).toEqual({
        details: ['Поля предмета не подходят к его категории'],
      });
    },
  );

  it('у еды насыщение обязательно: целое от 0 до 1000, других полей нет', async () => {
    const food = (details: unknown) => errorsOf({ category: 'food', details });
    const error = { details: ['Насыщение — целое число от 0 до 1000'] };
    expect(await food({ satiety: 20 })).toEqual({});
    expect(await food({ satiety: 0 })).toEqual({});
    expect(await food({ satiety: 1000 })).toEqual({});
    expect(await food({})).toEqual(error);
    expect(await food({ satiety: 1.5 })).toEqual(error);
    expect(await food({ satiety: -1 })).toEqual(error);
    expect(await food({ satiety: 1001 })).toEqual(error);
    expect(await food({ satiety: '20' })).toEqual(error);
    expect(await food({ satiety: 20, water: 1 })).toEqual(error);
  });

  it('у сокровища вид обязателен: камень, искусство или товар', async () => {
    const treasure = (details: unknown) =>
      errorsOf({ category: 'treasure', details });
    const error = { details: ['Выберите вид сокровища'] };
    expect(await treasure({ kind: 'gem' })).toEqual({});
    expect(await treasure({ kind: 'art' })).toEqual({});
    expect(await treasure({ kind: 'trade_good' })).toEqual({});
    expect(await treasure({})).toEqual(error);
    expect(await treasure({ kind: 'coin' })).toEqual(error);
    expect(await treasure({ kind: 'gem', size: 1 })).toEqual(error);
  });

  it('у контейнера груз в фунтах до сотых или null', async () => {
    const container = (details: unknown) =>
      errorsOf({ category: 'container', details });
    const error = {
      details: [
        'Груз — больше 0 и до 10000 фнт., не больше двух знаков после запятой',
      ],
    };
    expect(await container({ capacity: 30 })).toEqual({});
    expect(await container({ capacity: 0.29 })).toEqual({});
    expect(await container({ capacity: null })).toEqual({});
    expect(await container({})).toEqual(error);
    expect(await container({ capacity: 0 })).toEqual(error);
    expect(await container({ capacity: 0.125 })).toEqual(error);
    expect(await container({ capacity: 10001 })).toEqual(error);
    expect(await container({ capacity: '30' })).toEqual(error);
    expect(await container({ capacity: 30, volume: 1 })).toEqual(error);
  });

  it('у набора — от 1 до 50 разных предметов, количество целое от 1 до 1000', async () => {
    const pack = async (details: object) =>
      errorsOf({ category: 'pack', details });
    const error = {
      details: [
        'В наборе — от 1 до 50 разных предметов, количество каждого — целое от 1 до 1000',
      ],
    };
    const rope = '0b6f3c1e-8a52-4d3a-9f1e-2c4b5a6d7e8f';
    const torch = '1c7a4d2f-9b63-4e4b-8a2f-3d5c6b7e8f90';
    const entry = (itemId: string, quantity: number) => ({ itemId, quantity });
    expect(
      await pack({ contents: [entry(rope, 1), entry(torch, 10)] }),
    ).toEqual({});
    expect(await pack({ contents: [entry(rope, 1000)] })).toEqual({});
    expect(await pack({ contents: [] })).toEqual(error);
    expect(await pack({})).toEqual(error);
    expect(await pack({ contents: [entry(rope, 0)] })).toEqual(error);
    expect(await pack({ contents: [entry(rope, 1001)] })).toEqual(error);
    expect(await pack({ contents: [entry(rope, 1.5)] })).toEqual(error);
    expect(await pack({ contents: [entry('факел', 1)] })).toEqual(error);
    expect(await pack({ contents: [entry(rope, 1), entry(rope, 2)] })).toEqual(
      error,
    );
    expect(
      await pack({ contents: [{ ...entry(rope, 1), name: 'Верёвка' }] }),
    ).toEqual(error);
    expect(
      await pack({
        contents: Array.from({ length: 51 }, () => entry(rope, 1)),
      }),
    ).toEqual(error);
  });

  it('не пускает чужие поля в details базового предмета', async () => {
    expect(await errorsOf({ details: { damage: '1d6' } })).toEqual({
      details: ['Поля предмета не подходят к его категории'],
    });
    expect(await errorsOf({ details: [] })).toHaveProperty('details');
    expect(await errorsOf({ details: undefined })).toHaveProperty('details');
  });
});
