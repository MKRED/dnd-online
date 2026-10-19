import type { FormErrors } from '@mantine/form';
import { ABILITY_SCORES, type AbilityScore } from 'shared';
import { collectErrorFields } from '../../../components/form';
import { ABILITY_LABELS } from '../../characters';

// Поля с проверкой в порядке формы: сводка у кнопки перечисляет ошибки сверху вниз.
const FIELD_LABELS: Record<string, string> = {
  name: 'Название',
  tags: 'Теги',
  alignment: 'Мировоззрение',
  lairXp: 'Опыт в логове',
  armorClass: 'Класс доспеха',
  initiative: 'Инициатива',
  'hitPoints.average': 'Хиты (среднее)',
  'hitPoints.count': 'Число костей хитов',
  'hitPoints.bonus': 'Прибавка к хитам',
  'speed.walk': 'Скорость',
  'speed.burrow': 'Копание',
  'speed.climb': 'Лазание',
  'speed.fly': 'Полёт',
  'speed.swim': 'Плавание',
  abilities: '',
  skills: '',
  senses: '',
  passivePerception: 'Пассивное Восприятие',
  languages: 'Языки',
  legendaryActions: 'Легендарные действия',
  legendaryActionsLair: 'Легендарные действия в логове',
  'spellcasting.saveDc': 'СЛ спасброска от заклинаний',
  'spellcasting.attackBonus': 'Бонус атаки заклинанием',
  description: 'Описание',
};
const ORDER = Object.keys(FIELD_LABELS);

function labelOf(path: string): string {
  const [root, key, field] = path.split('.');
  if (root === 'abilities') {
    const ability = ABILITY_LABELS[key as AbilityScore];
    return field === 'save' ? `Спасбросок (${ability})` : ability;
  }
  // Номер строки: одинаковых полей «Навык» в списке несколько.
  if (root === 'skills') {
    return `${field === 'bonus' ? 'Бонус навыка' : 'Навык'} (${Number(key) + 1}-я строка)`;
  }
  if (root === 'senses') {
    return `${field === 'range' ? 'Дистанция' : 'Чувство'} (${Number(key) + 1}-я строка)`;
  }
  return FIELD_LABELS[path] ?? path;
}

function rankOf(path: string): number[] {
  const [root, key, field] = path.split('.');
  if (root === 'abilities') {
    return [
      ORDER.indexOf(root),
      ABILITY_SCORES.indexOf(key as AbilityScore),
      field === 'save' ? 1 : 0,
    ];
  }
  if (root === 'skills' || root === 'senses') {
    return [
      ORDER.indexOf(root),
      Number(key),
      field === 'sense' || field === 'skill' ? 0 : 1,
    ];
  }
  return [ORDER.indexOf(path)];
}

// Ошибки формы монстра сверху вниз — для сводки у кнопки.
export const monsterErrorFields = (errors: FormErrors) =>
  collectErrorFields(errors, labelOf, rankOf);
