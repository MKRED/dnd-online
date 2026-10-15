import { Stack, Text } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import type { ReactNode } from 'react';
import {
  ACTIVATION_LABELS,
  formatActivation,
  formatCosts,
  formatEffectDuration,
  formatEffectDurationShort,
} from 'shared';
import DurationField from './DurationField';
import { fromDurationValues } from './DurationField/durationForm';
import type { SimpleFormValues } from './SimpleEntryForm/simpleEntryValues';
import type { SimpleEntry } from './simpleCatalogs';
import UsageField, { fromUsageValues } from './UsageField';

// Общие поля всех записей одного раздела, которых нет у другого: у эффекта — длительность,
// у способности — активация и затраты. Раздел описывает их здесь, а форма, карточка и
// список берут отсюда, не зная, что это за поля.
export interface CatalogExtras {
  Field: (props: { form: UseFormReturnType<SimpleFormValues> }) => ReactNode;
  // Поля для тела запроса.
  toInput: (values: SimpleFormValues) => object;
  // Строки карточки: подпись и значение.
  rows: (entry: SimpleEntry) => { label: string; value: ReactNode }[];
  // Коротко — для колонки списка.
  listValue: (entry: SimpleEntry) => string | null;
}

export const EFFECT_EXTRAS: CatalogExtras = {
  Field: DurationField,
  toInput: (values) => ({ duration: fromDurationValues(values.duration) }),
  rows: (entry) =>
    'duration' in entry
      ? [{ label: 'Длительность', value: formatEffectDuration(entry.duration) }]
      : [],
  listValue: (entry) =>
    'duration' in entry ? formatEffectDurationShort(entry.duration) : null,
};

export const ABILITY_EXTRAS: CatalogExtras = {
  Field: UsageField,
  toInput: (values) => fromUsageValues(values.usage),
  rows: (entry) => {
    if (!('activation' in entry)) return [];
    const costs = formatCosts(entry.costs);
    return [
      { label: 'Активация', value: formatActivation(entry.activation) },
      {
        label: 'Затраты',
        value:
          costs.length === 0 ? (
            'Ничего не тратит'
          ) : (
            <Stack gap={2} component="span">
              {costs.map((line) => (
                <Text key={line} size="sm" span display="block">
                  {line}
                </Text>
              ))}
            </Stack>
          ),
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
