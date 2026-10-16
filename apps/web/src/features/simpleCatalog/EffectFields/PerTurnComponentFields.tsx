import {
  Checkbox,
  Group,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Text,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import {
  DAMAGE_DICE,
  DAMAGE_TYPE_LABELS,
  DAMAGE_TYPES,
  PER_TURN_BONUS_MAX,
  PER_TURN_DICE_MAX,
  PER_TURN_OUTCOME_LABELS,
  PER_TURN_OUTCOMES,
} from 'shared';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';

const OUTCOME_OPTIONS = PER_TURN_OUTCOMES.map((value) => ({
  value,
  label: PER_TURN_OUTCOME_LABELS[value],
}));
const TYPE_OPTIONS = DAMAGE_TYPES.map((value) => ({
  value,
  label: DAMAGE_TYPE_LABELS[value],
}));
const DIE_OPTIONS = DAMAGE_DICE.map((die) => ({
  value: String(die),
  label: `d${die}`,
}));
const EDGE_OPTIONS = [
  { value: 'start', label: 'В начале хода' },
  { value: 'end', label: 'В конце хода' },
];

interface PerTurnComponentFieldsProps {
  form: UseFormReturnType<SimpleFormValues>;
  index: number;
}

// Поля составляющей «Урон или лечение за ход»: что, сколько и когда. Сумма читается
// слева направо, как в книге: «1d6 + 2».
function PerTurnComponentFields({ form, index }: PerTurnComponentFieldsProps) {
  const path = `effect.components.${index}.perTurn`;
  const { outcome } = form.getValues().effect.components[index].perTurn;

  return (
    <Stack gap="xs">
      <SegmentedControl
        aria-label="Что происходит каждый ход"
        data={OUTCOME_OPTIONS}
        w="fit-content"
        maw="100%"
        {...form.getInputProps(`${path}.outcome`)}
      />
      {outcome === 'damage' && (
        <Select
          label="Тип урона"
          placeholder="Выберите тип"
          required
          data={TYPE_OPTIONS}
          allowDeselect={false}
          maw={260}
          {...form.getInputProps(`${path}.damageType`)}
        />
      )}
      <Group gap="xs" align="flex-start" wrap="nowrap">
        <NumberInput
          label="Сколько"
          min={0}
          max={PER_TURN_DICE_MAX}
          allowDecimal={false}
          allowNegative={false}
          w={80}
          {...form.getInputProps(`${path}.count`)}
        />
        <Select
          label="Кость"
          data={DIE_OPTIONS}
          allowDeselect={false}
          w={80}
          {...form.getInputProps(`${path}.die`)}
        />
        <Text pt={30}>+</Text>
        <NumberInput
          label="Число"
          min={0}
          max={PER_TURN_BONUS_MAX}
          allowDecimal={false}
          allowNegative={false}
          w={80}
          {...form.getInputProps(`${path}.bonus`)}
        />
      </Group>
      <Checkbox
        label="+ модификатор наложившего"
        description="Как у «Героизма»: временные хиты, равные модификатору заклинателя. Число подставит способность, наложившая эффект"
        {...form.getInputProps(`${path}.addModifier`, { type: 'checkbox' })}
      />
      <SegmentedControl
        aria-label="Когда срабатывает"
        data={EDGE_OPTIONS}
        w="fit-content"
        maw="100%"
        {...form.getInputProps(`${path}.edge`)}
      />
    </Stack>
  );
}

export default PerTurnComponentFields;
