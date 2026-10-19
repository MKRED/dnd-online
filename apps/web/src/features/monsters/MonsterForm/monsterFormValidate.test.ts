import { describe, expect, it } from 'vitest';
import { sampleMonster } from '../../../test/monsterFixture';
import { monsterErrorFields } from './monsterErrorFields';
import { validateMonsterForm } from './monsterFormValidate';
import {
  toMonsterFormValues,
  type MonsterFormValues,
} from './monsterFormValues';

const valid = () => toMonsterFormValues(sampleMonster);
const errorsOf = (change: (values: MonsterFormValues) => void) => {
  const values = valid();
  change(values);
  return validateMonsterForm(values);
};

describe('validateMonsterForm', () => {
  it.each<[string, (values: MonsterFormValues) => void, string, string]>([
    [
      'пустое название',
      (v) => (v.name = ' '),
      'name',
      'Название — от 1 до 100 символов',
    ],
    [
      'пустой КД',
      (v) => (v.armorClass = ''),
      'armorClass',
      'Обязательное поле',
    ],
    ['КД 0', (v) => (v.armorClass = 0), 'armorClass', 'От 1 до 50'],
    [
      'инициатива +31',
      (v) => (v.initiative = 31),
      'initiative',
      'От −10 до +30',
    ],
    [
      'скорость не кратна 5',
      (v) => (v.speed.fly = 42),
      'speed.fly',
      'От 5 до 300, кратно 5',
    ],
    [
      'значение 31',
      (v) => (v.abilities.wisdom.score = 31),
      'abilities.wisdom.score',
      'От 1 до 30',
    ],
    [
      'дробная кость',
      (v) => (v.hitPoints.count = 1.5),
      'hitPoints.count',
      'От 1 до 999',
    ],
    [
      'повтор навыка',
      (v) => v.skills.push({ id: 'x', skill: 'history', bonus: 1 }),
      'skills.2.skill',
      'Навык уже есть выше',
    ],
    [
      'навык не выбран',
      (v) => v.skills.push({ id: 'x', skill: '', bonus: 1 }),
      'skills.2.skill',
      'Выберите навык',
    ],
    [
      'чувство без дистанции',
      (v) => v.senses.push({ id: 'x', sense: 'blindsight', range: '' }),
      'senses.1.range',
      'Обязательное поле',
    ],
    [
      'в логове без легендарных действий',
      (v) => (v.legendaryActions = ''),
      'legendaryActionsLair',
      'Сначала укажите легендарные действия',
    ],
    [
      'СЛ 41',
      (v) => (v.spellcasting.saveDc = 41),
      'spellcasting.saveDc',
      'От 1 до 40',
    ],
  ])('%s', (_name, change, path, message) => {
    expect(errorsOf(change)).toEqual({ [path]: message });
  });

  it('«Видение невидимого» — без дистанции', () => {
    expect(
      errorsOf((v) =>
        v.senses.push({ id: 'x', sense: 'see_invisible', range: '' }),
      ),
    ).toEqual({});
  });

  it('сводка перечисляет ошибки в порядке формы', () => {
    const errors = errorsOf((v) => {
      v.spellcasting.saveDc = 0;
      v.abilities.charisma.save = 40;
      v.name = '';
      v.skills[1].bonus = '';
      v.abilities.strength.score = 0;
    });
    expect(monsterErrorFields(errors).map(({ label }) => label)).toEqual([
      'Название',
      'Сила',
      'Спасбросок (Харизма)',
      'Бонус навыка (2-я строка)',
      'СЛ спасброска от заклинаний',
    ]);
  });
});
