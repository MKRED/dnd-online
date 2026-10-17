import { Checkbox, Group, NumberInput, Select } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import {
  DURATION_AMOUNT_MAX,
  DURATION_UNITS,
  durationUnitLabel,
  type DurationUnit,
} from 'shared';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';

interface TimeFieldsProps {
  form: UseFormReturnType<SimpleFormValues>;
  // Где в форме лежат amount, unit и concentration: у эффекта и у заклинания свои.
  path: 'duration' | 'spell.duration';
  value: { amount: number | string; unit: DurationUnit };
  concentrationHint: string;
}

// Длительность «Время»: сколько, единица и концентрация — у эффекта и у заклинания.
function TimeFields({ form, path, value, concentrationHint }: TimeFieldsProps) {
  const amount = Number(value.amount) || 1;
  return (
    <>
      <Group gap="xs" align="flex-start" wrap="nowrap">
        <NumberInput
          aria-label="Сколько"
          min={1}
          max={DURATION_AMOUNT_MAX}
          allowDecimal={false}
          allowNegative={false}
          w={96}
          {...form.getInputProps(`${path}.amount`)}
        />
        <Select
          aria-label="Единица времени"
          data={DURATION_UNITS.map((unit) => ({
            value: unit,
            label: durationUnitLabel(unit, amount),
          }))}
          allowDeselect={false}
          w={140}
          {...form.getInputProps(`${path}.unit`)}
        />
      </Group>
      <Checkbox
        label="Концентрация"
        description={concentrationHint}
        {...form.getInputProps(`${path}.concentration`, { type: 'checkbox' })}
      />
    </>
  );
}

export default TimeFields;
