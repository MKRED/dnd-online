// Декораторы DTO читают метаданные типов — без полифила файл не загружается вне Nest.
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { AbilityDto } from '../../abilities/dto/ability.dto.js';
import { EffectDto } from '../../effects/dto/effect.dto.js';

const valid = {
  name: 'Ядовитый луч',
  category: 'basic',
  details: {},
  description: 'Дальность 60 фт., 2d6 яда',
  isPublic: false,
};

// Общие поля проверяет CatalogEntryDto, категорию и details — класс каталога. У обоих
// каталогов пока одна категория, поэтому проверяем их одними и теми же случаями.
describe.each([
  ['AbilityDto', AbilityDto],
  ['EffectDto', EffectDto],
])('%s', (_name, Dto) => {
  async function errorsOf(overrides: object): Promise<string[]> {
    const errors = await validate(
      plainToInstance(Dto, { ...valid, ...overrides }),
    );
    return errors.map((error) => error.property);
  }

  it('принимает базовую запись, и без описания тоже', async () => {
    expect(await errorsOf({})).toEqual([]);
    expect(await errorsOf({ description: undefined })).toEqual([]);
  });

  it('обрезает пробелы и не пускает пустое название', async () => {
    const dto = plainToInstance(Dto, { ...valid, name: '  Луч  ' });
    expect(dto.name).toBe('Луч');
    expect(await errorsOf({ name: '   ' })).toEqual(['name']);
    expect(await errorsOf({ name: 'я'.repeat(101) })).toEqual(['name']);
  });

  it('не пускает неизвестную категорию', async () => {
    expect(await errorsOf({ category: 'spell' })).toEqual(['category']);
  });

  it('у базовой категории details — только пустой объект', async () => {
    expect(await errorsOf({ details: { range: 60 } })).toEqual(['details']);
    expect(await errorsOf({ details: [] })).toEqual(['details']);
    expect(await errorsOf({ details: null })).toEqual(['details']);
  });

  it('требует признак публикации и ограничивает описание', async () => {
    expect(await errorsOf({ isPublic: 'да' })).toEqual(['isPublic']);
    expect(await errorsOf({ description: 'я'.repeat(5001) })).toEqual([
      'description',
    ]);
  });
});
