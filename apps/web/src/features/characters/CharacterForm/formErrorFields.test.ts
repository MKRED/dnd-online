import { describe, expect, it } from 'vitest';
import { errorFields } from './formErrorFields';

describe('errorFields', () => {
  it('перечисляет ошибки в порядке полей на странице', () => {
    const fields = errorFields({
      'spellSlots.3': 'От 0 до 9',
      hitDie: 'Обязательное поле',
      'abilityScores.wisdom': 'От 1 до 30',
      name: 'Обязательное поле',
      'classes.1.level': 'От 1 до 20',
      'abilityScores.strength': 'От 1 до 30',
      'classes.0.class': 'Обязательное поле',
    });
    expect(fields.map(({ label }) => label)).toEqual([
      'Имя',
      'Класс',
      'Уровень (2-й класс)',
      'Сила',
      'Мудрость',
      'Кость хитов',
      'Ячейки 3 круга',
    ]);
  });

  it('пропускает пустые ошибки и сохраняет текст', () => {
    expect(
      errorFields({
        name: null,
        hitPointsCurrent: 'Не может превышать максимум',
      }),
    ).toEqual([
      {
        path: 'hitPointsCurrent',
        label: 'ХП (текущие)',
        message: 'Не может превышать максимум',
      },
    ]);
  });
});
