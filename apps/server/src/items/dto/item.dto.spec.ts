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

  it.each(['food', 'material', 'quest'])(
    'принимает категорию %s с пустыми details и не пускает в них поля',
    async (category) => {
      expect(await errorsOf({ category })).toEqual({});
      expect(await errorsOf({ category, details: { portions: 3 } })).toEqual({
        details: ['Поля предмета не подходят к его категории'],
      });
    },
  );

  it('не пускает чужие поля в details базового предмета', async () => {
    expect(await errorsOf({ details: { damage: '1d6' } })).toEqual({
      details: ['Поля предмета не подходят к его категории'],
    });
    expect(await errorsOf({ details: [] })).toHaveProperty('details');
    expect(await errorsOf({ details: undefined })).toHaveProperty('details');
  });
});
