// Декораторы DTO читают метаданные типов — без полифила файл не загружается вне Nest.
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { AbilityDto } from '../../abilities/dto/ability.dto.js';
import { EffectDto } from '../../effects/dto/effect.dto.js';
import type { CatalogEntryDto } from './dto/catalog-entry.dto.js';

const valid = {
  name: 'Ядовитый луч',
  description: 'Дальность 60 фт., 2d6 яда',
  isPublic: false,
};

const ability = {
  category: 'basic',
  details: {},
  activation: { kind: 'action' },
  costs: { uses: null, spellSlot: null, movement: null, hitDie: false },
};
const effect = {
  components: [],
  duration: { kind: 'permanent' },
  saveEnds: null,
};

// Общие поля проверяет CatalogEntryDto, свои — класс каталога: их кладём в тело готовыми.
describe.each<[string, new () => CatalogEntryDto, object]>([
  ['AbilityDto', AbilityDto, ability],
  ['EffectDto', EffectDto, effect],
])('%s', (_name, Dto, own) => {
  async function errorsOf(overrides: object): Promise<string[]> {
    const errors = await validate(
      plainToInstance(Dto, { ...valid, ...own, ...overrides }),
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

  it('требует признак публикации и ограничивает описание', async () => {
    expect(await errorsOf({ isPublic: 'да' })).toEqual(['isPublic']);
    expect(await errorsOf({ description: 'я'.repeat(5001) })).toEqual([
      'description',
    ]);
  });
});

describe('AbilityDto: категория', () => {
  async function errorsOf(overrides: object): Promise<string[]> {
    const errors = await validate(
      plainToInstance(AbilityDto, { ...valid, ...ability, ...overrides }),
    );
    return errors.map((error) => error.property);
  }

  it('не пускает неизвестную категорию', async () => {
    expect(await errorsOf({ category: 'aura' })).toEqual(['category']);
  });

  it('у базовой категории details — только пустой объект', async () => {
    expect(await errorsOf({ details: { range: 60 } })).toEqual(['details']);
    expect(await errorsOf({ details: [] })).toEqual(['details']);
    expect(await errorsOf({ details: null })).toEqual(['details']);
  });
});

describe('EffectDto: длительность', () => {
  async function errorsOf(duration: unknown): Promise<string[]> {
    const errors = await validate(
      plainToInstance(EffectDto, { ...valid, ...effect, duration }),
    );
    return errors.map((error) => error.property);
  }

  it('принимает каждый вид длительности', async () => {
    expect(
      await errorsOf({
        kind: 'time',
        amount: 10,
        unit: 'minute',
        concentration: true,
      }),
    ).toEqual([]);
    expect(
      await errorsOf({ kind: 'turn', edge: 'start', owner: 'creator' }),
    ).toEqual([]);
    expect(await errorsOf({ kind: 'rest', rest: 'short' })).toEqual([]);
  });

  it('требует длительность и не пускает неверную', async () => {
    expect(await errorsOf(undefined)).toEqual(['duration']);
    expect(
      await errorsOf({
        kind: 'time',
        amount: 0,
        unit: 'minute',
        concentration: false,
      }),
    ).toEqual(['duration']);
    expect(await errorsOf({ kind: 'instant' })).toEqual(['duration']);
  });
});

describe('EffectDto: составляющие и снятие спасброском', () => {
  async function errorsOf(overrides: object): Promise<string[]> {
    const errors = await validate(
      plainToInstance(EffectDto, { ...valid, ...effect, ...overrides }),
    );
    return errors.map((error) => error.property);
  }

  it('принимает чувства и спасбросок в начале или конце хода', async () => {
    expect(
      await errorsOf({
        components: [
          { kind: 'sense', sense: 'darkvision', range: 60 },
          { kind: 'sense', sense: 'see_invisible', range: null },
        ],
        saveEnds: { ability: 'wisdom', edge: 'end' },
      }),
    ).toEqual([]);
  });

  it('требует оба поля и не пускает неверные', async () => {
    expect(await errorsOf({ components: undefined })).toEqual(['components']);
    expect(await errorsOf({ saveEnds: undefined })).toEqual(['saveEnds']);
    expect(
      await errorsOf({
        components: [{ kind: 'sense', sense: 'darkvision', range: null }],
      }),
    ).toEqual(['components']);
    expect(
      await errorsOf({ saveEnds: { ability: 'wisdom', edge: 'noon' } }),
    ).toEqual(['saveEnds']);
  });
});

describe('AbilityDto: активация и затраты', () => {
  const costs = { uses: null, spellSlot: null, movement: null, hitDie: false };
  async function errorsOf(overrides: object): Promise<string[]> {
    const errors = await validate(
      plainToInstance(AbilityDto, {
        ...valid,
        ...ability,
        activation: { kind: 'bonus_action' },
        costs,
        ...overrides,
      }),
    );
    return errors.map((error) => error.property);
  }

  it('принимает реакцию с условием и заряды с ячейкой', async () => {
    expect(
      await errorsOf({
        activation: { kind: 'reaction', trigger: 'когда вас бьют' },
        costs: {
          ...costs,
          uses: { count: { kind: 'proficiency' }, recovery: 'short_one' },
          spellSlot: { minLevel: 2 },
          movement: { kind: 'feet', feet: 30 },
        },
      }),
    ).toEqual([]);
  });

  it('требует оба поля и не пускает неверные', async () => {
    expect(await errorsOf({ activation: undefined })).toEqual(['activation']);
    expect(await errorsOf({ costs: undefined })).toEqual(['costs']);
    expect(await errorsOf({ activation: { kind: 'magic' } })).toEqual([
      'activation',
    ]);
    expect(await errorsOf({ costs: { ...costs, movement: 'double' } })).toEqual(
      ['costs'],
    );
  });
});
