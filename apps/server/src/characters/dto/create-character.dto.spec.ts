// @Type в DTO читает метаданные типов — без полифила файл не загружается вне Nest.
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateCharacterDto } from './create-character.dto.js';

// Проверяем отдельные поля: остальные обязательные поля DTO здесь не заполнены и дают свои ошибки.
async function errorsFor(property: string, plain: object): Promise<string[]> {
  const errors = await validate(plainToInstance(CreateCharacterDto, plain));
  return errors
    .filter((error) => error.property === property)
    .flatMap((error) => Object.values(error.constraints ?? {}));
}

const speciesErrors = (species: unknown) => errorsFor('species', { species });

describe('CreateCharacterDto', () => {
  it('принимает вид из справочника', async () => {
    expect(await speciesErrors('elf')).toEqual([]);
  });

  it('отклоняет вид не из справочника', async () => {
    expect(await speciesErrors('Эльф')).toEqual(['Неизвестный вид персонажа']);
    expect(await speciesErrors(undefined)).toEqual([
      'Неизвестный вид персонажа',
    ]);
  });

  it('принимает род только у вида, где он есть', async () => {
    expect(
      await errorsFor('speciesLineage', {
        species: 'elf',
        speciesLineage: 'Свой род',
      }),
    ).toEqual([]);
    expect(await errorsFor('speciesLineage', { species: 'human' })).toEqual([]);
    expect(
      await errorsFor('speciesLineage', {
        species: 'human',
        speciesLineage: 'Дроу',
      }),
    ).toEqual(['У этого вида нет рода или наследия']);
  });
});
