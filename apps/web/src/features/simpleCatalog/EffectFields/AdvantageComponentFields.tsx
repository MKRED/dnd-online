import { SegmentedControl, Select, Stack } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import {
  ABILITY_SCORES,
  ADVANTAGE_MODE_LABELS,
  ADVANTAGE_MODES,
  ADVANTAGE_ROLL_LABELS,
  ADVANTAGE_ROLLS,
  advantageHasAbility,
} from 'shared';
import { ABILITY_LABELS } from '../../characters';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';

const MODE_OPTIONS = ADVANTAGE_MODES.map((value) => ({
  value,
  label: ADVANTAGE_MODE_LABELS[value],
}));
const ROLL_OPTIONS = ADVANTAGE_ROLLS.map((value) => ({
  value,
  label: ADVANTAGE_ROLL_LABELS[value],
}));
const ABILITY_OPTIONS = [
  { value: 'all', label: 'Все характеристики' },
  ...ABILITY_SCORES.map((value) => ({ value, label: ABILITY_LABELS[value] })),
];

interface AdvantageComponentFieldsProps {
  form: UseFormReturnType<SimpleFormValues>;
  index: number;
}

// Поля составляющей «Преимущество или помеха»: что, на какие броски и, у спасбросков и
// проверок, с какой характеристикой. Проверки и спасброски Силы, как у Enlarge, — две
// карточки: так у каждой одна строка в карточке эффекта.
function AdvantageComponentFields({
  form,
  index,
}: AdvantageComponentFieldsProps) {
  const path = `effect.components.${index}.advantage`;
  const { roll } = form.getValues().effect.components[index].advantage;

  return (
    <Stack gap="xs">
      <SegmentedControl
        aria-label="Преимущество или помеха"
        data={MODE_OPTIONS}
        size="xs"
        w="fit-content"
        maw="100%"
        {...form.getInputProps(`${path}.mode`)}
      />
      <Select
        label="На какие броски"
        data={ROLL_OPTIONS}
        allowDeselect={false}
        maw={260}
        {...form.getInputProps(`${path}.roll`)}
      />
      {advantageHasAbility(roll) && (
        <Select
          label="Характеристика"
          data={ABILITY_OPTIONS}
          allowDeselect={false}
          maw={260}
          {...form.getInputProps(`${path}.ability`)}
        />
      )}
    </Stack>
  );
}

export default AdvantageComponentFields;
