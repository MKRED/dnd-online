import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { ClassLevelDto } from './basics.dto.js';

async function errorsFor(plain: object): Promise<string[]> {
  const errors = await validate(plainToInstance(ClassLevelDto, plain));
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('ClassLevelDto', () => {
  it('принимает класс из справочника и подкласс с 3-го уровня', async () => {
    expect(
      await errorsFor({ class: 'rogue', level: 3, subclass: 'Свой подкласс' }),
    ).toEqual([]);
    expect(await errorsFor({ class: 'fighter', level: 1 })).toEqual([]);
  });

  it('отклоняет класс не из справочника', async () => {
    expect(await errorsFor({ class: 'Воин', level: 1 })).toEqual([
      'Неизвестный класс персонажа',
    ]);
  });

  it('отклоняет подкласс ниже 3-го уровня', async () => {
    expect(
      await errorsFor({ class: 'fighter', level: 2, subclass: 'Чемпион' }),
    ).toEqual(['Подкласс доступен с 3-го уровня класса']);
  });
});
