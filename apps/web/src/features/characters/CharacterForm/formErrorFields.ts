import type { FormErrors } from '@mantine/form';
import { ABILITY_SCORES, type AbilityScore } from 'shared';
import { collectErrorFields } from '../../../components/form';
import { ABILITY_LABELS } from '../characterLabels';

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
  'actionCount',
  'bonusActionCount',
  'reactionCount',
  'heroicInspiration',
  'spellSlots',
];

const FIELD_LABELS: Record<string, string> = {
  name: 'Имя',
  species: 'Раса',
  background: 'Предыстория',
  proficiencyBonus: 'Бонус мастерства',
  armorClass: 'КД без доспеха',
  speed: 'Скорость без эффектов',
  hitPointsMax: 'ХП (максимум)',
  hitPointsCurrent: 'ХП (текущие)',
  hitDie: 'Кость хитов',
  heroicInspiration: 'Героическое вдохновение',
  actionCount: 'Действия',
  bonusActionCount: 'Бонусные действия',
  reactionCount: 'Реакции',
};

function labelOf(path: string): string {
  const [root, key, field] = path.split('.');
  if (root === 'classes') {
    // Номер класса — только у мультикласса, где одинаковых полей «Класс» несколько.
    const name = field === 'level' ? 'Уровень' : 'Класс';
    return key === '0' ? name : `${name} (${Number(key) + 1}-й класс)`;
  }
  if (root === 'abilityScores') return ABILITY_LABELS[key as AbilityScore];
  if (root === 'spellSlots') return `Ячейки ${key} круга`;
  return FIELD_LABELS[path] ?? path;
}

function rankOf(path: string): number[] {
  const [root, key, field] = path.split('.');
  const base = FIELD_ORDER.indexOf(root);
  if (root === 'classes') return [base, Number(key), field === 'level' ? 1 : 0];
  if (root === 'abilityScores') {
    return [base, ABILITY_SCORES.indexOf(key as AbilityScore), 0];
  }
  if (root === 'spellSlots') return [base, Number(key), 0];
  return [base, 0, 0];
}

// Ошибки формы персонажа сверху вниз — для сводки у кнопки.
export const errorFields = (errors: FormErrors) =>
  collectErrorFields(errors, labelOf, rankOf);
