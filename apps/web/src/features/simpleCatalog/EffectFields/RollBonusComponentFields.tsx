import {
  Group,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Text,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import {
  ABILITY_SCORES,
  DAMAGE_DICE,
  DAMAGE_TYPE_LABELS,
  DAMAGE_TYPES,
  ROLL_BONUS_DICE_MAX,
  ROLL_BONUS_MODE_LABELS,
  ROLL_BONUS_MODES,
  ROLL_BONUS_NUMBER_MAX,
  ROLL_BONUS_ROLL_LABELS,
  ROLL_BONUS_ROLLS,
  rollBonusHasAbility,
  rollBonusHasDamageType,
} from 'shared';
import { ABILITY_LABELS } from '../../characters';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';

const MODE_OPTIONS = ROLL_BONUS_MODES.map((value) => ({
  value,
  label: ROLL_BONUS_MODE_LABELS[value],
}));
const ROLL_OPTIONS = ROLL_BONUS_ROLLS.map((value) => ({
  value,
  label: ROLL_BONUS_ROLL_LABELS[value],
}));
const ABILITY_OPTIONS = [
  { value: 'all', label: 'Все характеристики' },
  ...ABILITY_SCORES.map((value) => ({ value, label: ABILITY_LABELS[value] })),
];
const DIE_OPTIONS = DAMAGE_DICE.map((die) => ({
  value: String(die),
  label: `d${die}`,
}));
const TYPE_OPTIONS = [
  { value: 'same', label: 'Того же типа, что атака' },
  ...DAMAGE_TYPES.map((value) => ({ value, label: DAMAGE_TYPE_LABELS[value] })),
];

interface RollBonusComponentFieldsProps {
  form: UseFormReturnType<SimpleFormValues>;
  index: number;
}

// Поля составляющей «Бонус к броску»: прибавить или вычесть, к каким броскам, сколько.
// Атаки и спасброски Bless — две карточки, как у «Преимущества или помехи»: у каждой одна
// строка в карточке эффекта. Число всегда положительное: «Вычесть» — отдельный выбор.
function RollBonusComponentFields({
  form,
  index,
}: RollBonusComponentFieldsProps) {
  const path = `effect.components.${index}.rollBonus`;
  const values = form.getValues().effect.components[index].rollBonus;

  return (
    <Stack gap="xs">
      <SegmentedControl
        aria-label="Прибавить или вычесть"
        data={MODE_OPTIONS}
        size="xs"
        w="fit-content"
        maw="100%"
        {...form.getInputProps(`${path}.mode`)}
      />
      <Select
        label="К каким броскам"
        data={ROLL_OPTIONS}
        allowDeselect={false}
        maw={260}
        {...form.getInputProps(`${path}.roll`)}
      />
      {rollBonusHasAbility(values.roll) && (
        <Select
          label="Характеристика"
          data={ABILITY_OPTIONS}
          allowDeselect={false}
          maw={260}
          {...form.getInputProps(`${path}.ability`)}
        />
      )}
      <Group gap="xs" align="flex-start" wrap="nowrap">
        <NumberInput
          label="Сколько"
          min={0}
          max={ROLL_BONUS_DICE_MAX}
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
          max={ROLL_BONUS_NUMBER_MAX}
          allowDecimal={false}
          allowNegative={false}
          w={80}
          {...form.getInputProps(`${path}.number`)}
        />
      </Group>
      {rollBonusHasDamageType(values) && (
        <Select
          label="Тип урона"
          description="Как у Divine Favor: +1d4 Излучением"
          data={TYPE_OPTIONS}
          allowDeselect={false}
          maw={260}
          {...form.getInputProps(`${path}.damageType`)}
        />
      )}
    </Stack>
  );
}

export default RollBonusComponentFields;
