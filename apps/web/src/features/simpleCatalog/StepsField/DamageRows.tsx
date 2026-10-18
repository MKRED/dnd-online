import {
  ActionIcon,
  Button,
  Group,
  NumberInput,
  Select,
  Text,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import {
  DAMAGE_DICE,
  DAMAGE_DICE_MAX,
  DAMAGE_NUMBER_MAX,
  DAMAGE_PARTS_MAX,
  DAMAGE_TYPE_LABELS,
  DAMAGE_TYPES,
} from 'shared';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';
import { newDamage, type DamageValues } from './damageForm';

const DIE_OPTIONS = DAMAGE_DICE.map((die) => ({
  value: String(die),
  label: `d${die}`,
}));
const TYPE_OPTIONS = DAMAGE_TYPES.map((value) => ({
  value,
  label: DAMAGE_TYPE_LABELS[value],
}));

interface DamageRowsProps {
  form: UseFormReturnType<SimpleFormValues>;
  // Путь списка: «steps.0.damage» или «steps.0.growthDamage».
  path: string;
  rows: DamageValues[];
  addLabel: string;
}

// Строки урона (кости + число, тип) с кнопкой «добавить» — у исхода шага и у его роста.
function DamageRows({ form, path, rows, addLabel }: DamageRowsProps) {
  const lastType = rows.at(-1)?.type;
  return (
    <>
      {rows.map((part, row) => (
        <Group key={part.key} gap="xs" align="flex-start" wrap="wrap">
          <Group gap="xs" align="flex-start" wrap="nowrap">
            <NumberInput
              aria-label="Сколько костей"
              min={0}
              max={DAMAGE_DICE_MAX}
              allowDecimal={false}
              allowNegative={false}
              w={64}
              {...form.getInputProps(`${path}.${row}.count`)}
            />
            <Select
              aria-label="Кость"
              data={DIE_OPTIONS}
              allowDeselect={false}
              w={76}
              {...form.getInputProps(`${path}.${row}.die`)}
            />
            <Text pt={6}>+</Text>
            <NumberInput
              aria-label="Число"
              min={0}
              max={DAMAGE_NUMBER_MAX}
              allowDecimal={false}
              allowNegative={false}
              w={64}
              {...form.getInputProps(`${path}.${row}.number`)}
            />
          </Group>
          <Group gap="xs" align="flex-start" wrap="nowrap">
            <Select
              aria-label="Тип урона"
              data={TYPE_OPTIONS}
              allowDeselect={false}
              w={160}
              {...form.getInputProps(`${path}.${row}.type`)}
            />
            <ActionIcon
              variant="subtle"
              color="gray"
              mt={4}
              aria-label="Убрать урон"
              title="Убрать урон"
              onClick={() => form.removeListItem(path, row)}
            >
              ✕
            </ActionIcon>
          </Group>
        </Group>
      ))}
      {rows.length < DAMAGE_PARTS_MAX && (
        <Button
          variant="subtle"
          size="xs"
          w="fit-content"
          px={4}
          // Вторая строка чаще другого типа, но начинать удобнее с того же.
          onClick={() => form.insertListItem(path, newDamage(lastType))}
        >
          {addLabel}
        </Button>
      )}
    </>
  );
}

export default DamageRows;
