import type { FormErrors } from '@mantine/form';
import { ABILITY_SCORES, type AbilityScore } from 'shared';
import { ABILITY_LABELS } from '../characterLabels';

export interface ErrorField {
  path: string;
  label: string;
  message: string;
}

// Поля с проверкой в порядке формы: сводка у кнопки перечисляет ошибки сверху вниз.
// Классы стоят между предысторией и характеристиками, поэтому порядок задан вручную.
const FIELD_ORDER = [
  'name',
  'species',
  'background',
  'classes',
  'abilityScores',
  'proficiencyBonus',
  'armorClass',
  'speed',
  'hitPointsMax',
  'hitPointsCurrent',
  'hitDie',
  'heroicInspiration',
];

const FIELD_LABELS: Record<string, string> = {
  name: 'Имя',
  species: 'Раса',
  background: 'Предыстория',
  proficiencyBonus: 'Бонус мастерства',
  armorClass: 'Класс доспеха без эффектов',
  speed: 'Скорость без эффектов',
  hitPointsMax: 'ХП (максимум)',
  hitPointsCurrent: 'ХП (текущие)',
  hitDie: 'Кость хитов',
  heroicInspiration: 'Героическое вдохновение',
};

function labelOf(path: string): string {
  const [root, key, field] = path.split('.');
  if (root === 'classes') {
    // Номер класса — только у мультикласса, где одинаковых полей «Класс» несколько.
    const name = field === 'level' ? 'Уровень' : 'Класс';
    return key === '0' ? name : `${name} (${Number(key) + 1}-й класс)`;
  }
  if (root === 'abilityScores') return ABILITY_LABELS[key as AbilityScore];
  return FIELD_LABELS[path] ?? path;
}

function rankOf(path: string): number[] {
  const [root, key, field] = path.split('.');
  const base = FIELD_ORDER.indexOf(root);
  if (root === 'classes') return [base, Number(key), field === 'level' ? 1 : 0];
  if (root === 'abilityScores') {
    return [base, ABILITY_SCORES.indexOf(key as AbilityScore), 0];
  }
  return [base, 0, 0];
}

const byRank = (a: number[], b: number[]) =>
  a.reduce((diff, value, i) => diff || value - b[i], 0);

// Ошибки формы — списком «поле — что не так», в том порядке, в каком поля идут на странице.
export function errorFields(errors: FormErrors): ErrorField[] {
  return Object.entries(errors)
    .flatMap(([path, message]) =>
      // Все проверки формы возвращают строку; пустое значение — ошибки нет.
      typeof message === 'string' && message
        ? [{ path, label: labelOf(path), message }]
        : [],
    )
    .sort((a, b) => byRank(rankOf(a.path), rankOf(b.path)));
}
