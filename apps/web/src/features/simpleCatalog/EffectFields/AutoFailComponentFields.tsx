import { Select, Stack } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import {
  ABILITY_SCORES,
  AUTO_FAIL_ROLL_LABELS,
  AUTO_FAIL_ROLLS,
  autoFailHasAbility,
} from 'shared';
import { ABILITY_LABELS } from '../../characters';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';

const ROLL_OPTIONS = AUTO_FAIL_ROLLS.map((value) => ({
  value,
  label: AUTO_FAIL_ROLL_LABELS[value],
}));
const ABILITY_OPTIONS = [
  { value: 'all', label: 'Все характеристики' },
  ...ABILITY_SCORES.map((value) => ({ value, label: ABILITY_LABELS[value] })),
];

interface AutoFailComponentFieldsProps {
  form: UseFormReturnType<SimpleFormValues>;
  index: number;
}

// Поля составляющей «Автопровал»: какие броски и, у спасбросков, с какой характеристикой.
// Спасброски Силы и Ловкости, как у Парализованного, — две карточки, как у «Преимущества
// или помехи»: так у каждой одна строка в карточке эффекта.
function AutoFailComponentFields({
  form,
  index,
}: AutoFailComponentFieldsProps) {
  const path = `effect.components.${index}.autoFail`;
  const { roll } = form.getValues().effect.components[index].autoFail;

  return (
    <Stack gap="xs">
      <Select
        label="Какие броски"
        data={ROLL_OPTIONS}
        allowDeselect={false}
        maw={300}
        {...form.getInputProps(`${path}.roll`)}
      />
      {autoFailHasAbility(roll) && (
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

export default AutoFailComponentFields;
