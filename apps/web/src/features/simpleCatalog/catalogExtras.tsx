import type { UseFormReturnType } from '@mantine/form';
import type { ReactNode } from 'react';
import {
  ACTIVATION_LABELS,
  EFFECT_COMPONENT_LABELS,
  formatActivation,
  formatCosts,
  formatEffectDuration,
  formatEffectDurationShort,
  formatSaveEnds,
  formatSense,
  type Effect,
} from 'shared';
import CardLines from './CardLines';
import { fromDurationValues } from './DurationField';
import EffectFields, { fromEffectValues } from './EffectFields';
import type { SimpleFormValues } from './SimpleEntryForm/simpleEntryValues';
import type { SimpleEntry } from './simpleCatalogs';
import UsageField, { fromUsageValues } from './UsageField';

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
  const senses = effect.components.map(formatSense);
  return senses.length === 0
    ? []
    : [
        {
          label: EFFECT_COMPONENT_LABELS.sense,
          value: <CardLines lines={senses} />,
        },
      ];
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

export const ABILITY_EXTRAS: CatalogExtras = {
  Field: UsageField,
  toInput: (values) => ({
    category: values.category,
    details: {},
    ...fromUsageValues(values.usage),
  }),
  rows: (entry) => {
    if (!('activation' in entry)) return [];
    const costs = formatCosts(entry.costs);
    return [
      { label: 'Активация', value: formatActivation(entry.activation) },
      {
        label: 'Затраты',
        value:
          costs.length === 0 ? 'Ничего не тратит' : <CardLines lines={costs} />,
      },
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
