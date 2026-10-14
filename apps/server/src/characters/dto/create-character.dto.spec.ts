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

// Ошибки вложенного объекта лежат в children, а не в constraints самого поля.
async function proficienciesErrors(overrides: object): Promise<string[]> {
  const dto = plainToInstance(CreateCharacterDto, {
    proficiencies: {
      armor: [],
      weapons: [],
      tools: [],
      languages: [],
      ...overrides,
    },
  });
  const errors = await validate(dto);
  return errors
    .filter((error) => error.property === 'proficiencies')
    .flatMap((error) => error.children ?? [])
    .flatMap((child) => Object.values(child.constraints ?? {}));
}

describe('CreateCharacterDto', () => {
  it('принимает вид из справочника', async () => {
    expect(await speciesErrors('elf')).toEqual([]);
  });

  it('отклоняет вид не из справочника', async () => {
    expect(await speciesErrors('Эльф')).toEqual(['Неизвестная раса персонажа']);
    expect(await speciesErrors(undefined)).toEqual([
      'Неизвестная раса персонажа',
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
    ).toEqual(['У этой расы нет рода или наследия']);
  });

  it('принимает только существующую кость хитов', async () => {
    expect(await errorsFor('hitDie', { hitDie: 10 })).toEqual([]);
    expect(await errorsFor('hitDie', {})).toEqual([
      'Кость хитов бывает только к6, к8, к10 или к12',
    ]);
    expect(await errorsFor('hitDie', { hitDie: 20 })).toEqual([
      'Кость хитов бывает только к6, к8, к10 или к12',
    ]);
  });

  it('принимает владение доспехами только из четырёх категорий, без повторов', async () => {
    const armorErrors = (armor: unknown) => proficienciesErrors({ armor });
    expect(await armorErrors(['light', 'shield'])).toEqual([]);
    expect(await armorErrors([])).toEqual([]);
    expect(await armorErrors(['Лёгкие'])).toEqual([
      'Владение доспехами бывает только четырёх категорий',
    ]);
    expect(await armorErrors(['light', 'light'])).toEqual([
      'Категории доспехов не должны повторяться',
    ]);
  });

  it('принимает владение оружием только из справочника', async () => {
    const weaponErrors = (weapons: unknown) => proficienciesErrors({ weapons });
    expect(await weaponErrors(['martial', 'handCrossbow'])).toEqual([]);
    expect(await weaponErrors(['Бумеранг'])).toEqual([
      'Владение оружием выбирается только из справочника',
    ]);
    expect(await weaponErrors(['dagger', 'dagger'])).toEqual([
      'Владения оружием не должны повторяться',
    ]);
  });

  it('ограничивает длину прочих владений', async () => {
    expect(await proficienciesErrors({ other: 'Ездовые животные' })).toEqual(
      [],
    );
    expect(await proficienciesErrors({})).toEqual([]);
    expect(await proficienciesErrors({ other: 'я'.repeat(501) })).toEqual([
      'Прочие владения — не длиннее 500 символов',
    ]);
  });
});
