import { SegmentedControl, Select, Stack } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import {
  ABILITY_SCORES,
  ADVANTAGE_MODE_LABELS,
  ADVANTAGE_MODES,
  ADVANTAGE_ROLL_LABELS,
  ADVANTAGE_ROLLS,
  ADVANTAGE_WHEN_LABELS,
  advantageHasAbility,
  advantageWhens,
  type AdvantageRoll,
} from 'shared';
import { ABILITY_LABELS } from '../../characters';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';
import { shownAdvantageWhen } from './advantageForm';

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

const whenOptions = (roll: AdvantageRoll) => [
  { value: 'always', label: 'Всегда' },
  ...advantageWhens(roll).map((value) => ({
    value,
    label: ADVANTAGE_WHEN_LABELS[value],
  })),
];

interface AdvantageComponentFieldsProps {
  form: UseFormReturnType<SimpleFormValues>;
  index: number;
}

// Поля составляющей «Преимущество или помеха»: что, на какие броски и, у спасбросков и
// проверок, с какой характеристикой, и когда. Проверки и спасброски Силы, как у Enlarge, — две
// карточки: так у каждой одна строка в карточке эффекта. «Когда» видно только у бросков,
// где есть условия (у инициативы их нет): пустой список с одним «Всегда» только мешал бы.
// Опрокинутый — тоже две карточки: преимущество в 5 фт. и помеха дальше.
function AdvantageComponentFields({
  form,
  index,
}: AdvantageComponentFieldsProps) {
  const path = `effect.components.${index}.advantage`;
  const advantage = form.getValues().effect.components[index].advantage;
  const { roll } = advantage;

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
      {advantageWhens(roll).length > 0 && (
        <Select
          label="Когда"
          data={whenOptions(roll)}
          allowDeselect={false}
          maw={320}
          {...form.getInputProps(`${path}.when`)}
          value={shownAdvantageWhen(advantage)}
        />
      )}
    </Stack>
  );
}

export default AdvantageComponentFields;
