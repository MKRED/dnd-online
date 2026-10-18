import type { ReactNode } from 'react';
import {
  formatActivation,
  formatCosts,
  formatSpellDuration,
  formatSpellHeader,
  formatStepsWithGrowth,
  growthBasis,
  type AbilityFields,
  type AbilityVariant,
} from 'shared';
import CardLines from './CardLines';

// Что карточке нужно от способности — без автора и картинки: так же строит строки и
// пример гайда (AbilityGuide).
export type AbilityCard = AbilityVariant & AbilityFields;

// Строки заклинания до активации: «3 круг, воплощение» — как заголовок в книге.
const spellHeaderRows = (entry: AbilityCard) =>
  entry.category === 'spell'
    ? [{ label: 'Заклинание', value: formatSpellHeader(entry.details) }]
    : [];

// После затрат, как в книге — компоненты и длительность.
function spellTailRows(entry: AbilityCard) {
  if (entry.category !== 'spell') return [];
  const { components, duration } = entry.details;
  return [
    ...(components ? [{ label: 'Компоненты', value: components }] : []),
    { label: 'Длительность', value: formatSpellDuration(duration) },
  ];
}

// Строки карточки способности: подпись и значение.
export function abilityRows(
  entry: AbilityCard,
): { label: string; value: ReactNode }[] {
  const costs = formatCosts(entry.costs);
  const ritual = entry.category === 'spell' && entry.details.ritual;
  return [
    ...spellHeaderRows(entry),
    {
      label: 'Активация',
      value: `${formatActivation(entry.activation)}${ritual ? ' или ритуал' : ''}`,
    },
    {
      label: 'Затраты',
      value:
        costs.length === 0 ? 'Ничего не тратит' : <CardLines lines={costs} />,
    },
    ...spellTailRows(entry),
    // Подпись — ещё и ключ строки: у нескольких шагов она своя у каждого.
    ...formatStepsWithGrowth(entry.steps, growthBasis(entry, entry.costs)).map(
      (lines, index, all) => ({
        label: all.length > 1 ? `Шаг ${index + 1}` : 'Применение',
        value: <CardLines lines={lines} />,
      }),
    ),
  ];
}
