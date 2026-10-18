import type { UseFormReturnType } from '@mantine/form';
import type { ReactNode } from 'react';
import {
  ACTIVATION_LABELS,
  EFFECT_COMPONENT_LABELS,
  effectComponentKinds,
  formatActivation,
  formatCosts,
  formatEffectDuration,
  formatEffectDurationShort,
  formatEffectComponent,
  formatSaveEnds,
  formatSpellDuration,
  formatSpellHeader,
  formatStepsWithGrowth,
  growthBasis,
  type Ability,
  type Effect,
} from 'shared';
import CardLines from './CardLines';
import { fromDurationValues } from './DurationField';
import EffectFields, { fromEffectValues } from './EffectFields';
import type { SimpleFormValues } from './SimpleEntryForm/simpleEntryValues';
import type { SimpleEntry } from './simpleCatalogs';
import AbilityFields from './AbilityFields';
import { abilityCategoryInput } from './abilityInput';
import { chainSteps, fromStepValues } from './StepsField';

// Свои поля всех записей одного раздела, которых нет у другого: у эффекта — составляющие,
// длительность и снятие спасброском, у способности — категория, активация и затраты.
// Раздел описывает их здесь, а форма, карточка и список берут отсюда, не зная, что это
// за поля.
export interface CatalogExtras {
  Field: (props: { form: UseFormReturnType<SimpleFormValues> }) => ReactNode;
  // Поля для тела запроса.
  toInput: (values: SimpleFormValues) => object;
  // Строки карточки: подпись и значение.
  rows: (entry: SimpleEntry) => { label: string; value: ReactNode }[];
  // Коротко — для колонки списка.
  listValue: (entry: SimpleEntry) => string | null;
}

// Строки по одной на вид составляющей: несколько чувств — в одной строке «Чувство».
function componentRows(effect: Effect) {
  return effectComponentKinds(effect.components).map((kind) => ({
    label: EFFECT_COMPONENT_LABELS[kind],
    value: (
      <CardLines
        lines={effect.components
          .filter((component) => component.kind === kind)
          .map(formatEffectComponent)}
      />
    ),
  }));
}

export const EFFECT_EXTRAS: CatalogExtras = {
  Field: EffectFields,
  toInput: (values) => ({
    ...fromEffectValues(values.effect),
    duration: fromDurationValues(values.duration),
  }),
  rows: (entry) => {
    if (!('components' in entry)) return [];
    return [
      ...componentRows(entry),
      { label: 'Длительность', value: formatEffectDuration(entry.duration) },
      ...(entry.saveEnds
        ? [{ label: 'Снимается', value: formatSaveEnds(entry.saveEnds) }]
        : []),
    ];
  },
  listValue: (entry) =>
    'duration' in entry ? formatEffectDurationShort(entry.duration) : null,
};

// Строки заклинания до активации: «3 круг, воплощение» — как заголовок в книге.
const spellHeaderRows = (entry: Ability) =>
  entry.category === 'spell'
    ? [{ label: 'Заклинание', value: formatSpellHeader(entry.details) }]
    : [];

// После затрат, как в книге — компоненты и длительность.
function spellTailRows(entry: Ability) {
  if (entry.category !== 'spell') return [];
  const { components, duration } = entry.details;
  return [
    ...(components ? [{ label: 'Компоненты', value: components }] : []),
    { label: 'Длительность', value: formatSpellDuration(duration) },
  ];
}

export const ABILITY_EXTRAS: CatalogExtras = {
  Field: AbilityFields,
  toInput: (values) => ({
    ...abilityCategoryInput(values),
    // Цепочка ещё раз сверяется перед отправкой: правка могла не успеть отрисоваться.
    steps: chainSteps(values.steps).map(fromStepValues),
  }),
  rows: (entry) => {
    if (!('activation' in entry)) return [];
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
      ...formatStepsWithGrowth(
        entry.steps,
        growthBasis(entry, entry.costs),
      ).map((lines, index, all) => ({
        label: all.length > 1 ? `Шаг ${index + 1}` : 'Применение',
        value: <CardLines lines={lines} />,
      })),
    ];
  },
  // Условие реакции в колонке не поместится — только вид или время.
  listValue: (entry) => {
    if (!('activation' in entry)) return null;
    const { activation } = entry;
    return activation.kind === 'time'
      ? formatActivation(activation)
      : ACTIVATION_LABELS[activation.kind];
  },
};
