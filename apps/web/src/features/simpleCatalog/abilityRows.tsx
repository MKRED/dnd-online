import { Stack } from '@mantine/core';
import type { ReactNode } from 'react';
import {
  formatAbilitySteps,
  formatActivation,
  formatAbilityCosts,
  formatEffectComponent,
  formatSpellDuration,
  formatSpellHeader,
  formatStepGrowth,
  growthBasis,
  stepEffectOutcomes,
  type AbilityFields,
  type AbilityVariant,
  type GrowthBasis,
} from 'shared';
import CardLines from './CardLines';
import StepEffectsLine from './StepEffectsLine';

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

// Шаг в карточке: его строки, эффекты исходов (ссылками) и последней строкой рост.
// Подпись — ещё и ключ строки: у нескольких шагов она своя у каждого.
function stepRows(entry: AbilityCard, basis: GrowthBasis) {
  const lines = formatAbilitySteps(entry.steps);
  return entry.steps.map((step, index) => {
    const growth = formatStepGrowth(step.growth, basis);
    return {
      label: entry.steps.length > 1 ? `Шаг ${index + 1}` : 'Применение',
      value: (
        <Stack gap={2} component="span">
          <CardLines lines={lines[index]} />
          {stepEffectOutcomes(step).map((outcome) => (
            <StepEffectsLine key={outcome.label} outcome={outcome} />
          ))}
          {growth && <CardLines lines={[growth]} />}
        </Stack>
      ),
    };
  });
}

// Строки карточки способности: подпись и значение.
export function abilityRows(
  entry: AbilityCard,
): { label: string; value: ReactNode }[] {
  // У монстра затраты начинаются с «Ограничения»: «3/день», «Перезарядка 5–6».
  const costs = formatAbilityCosts(
    entry.category,
    entry.costs,
    entry.category === 'monster' ? entry.details.recharge : null,
  );
  const ritual = entry.category === 'spell' && entry.details.ritual;
  return [
    ...spellHeaderRows(entry),
    {
      label: 'Активация',
      value: `${formatActivation(entry.activation)}${ritual ? ' или ритуал' : ''}`,
    },
    // Что черта даёт всегда (docs/plan/done/traits.md) — сразу под активацией «Черта».
    ...(entry.passive.length > 0
      ? [
          {
            label: 'Действует всегда',
            value: (
              <CardLines lines={entry.passive.map(formatEffectComponent)} />
            ),
          },
        ]
      : []),
    {
      label: 'Затраты',
      value:
        costs.length === 0 ? 'Ничего не тратит' : <CardLines lines={costs} />,
    },
    ...spellTailRows(entry),
    ...stepRows(entry, growthBasis(entry, entry.costs)),
  ];
}
