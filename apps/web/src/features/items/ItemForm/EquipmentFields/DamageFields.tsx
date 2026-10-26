import {
  ActionIcon,
  Button,
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { IconPlus, IconX } from '@tabler/icons-react';
import {
  DAMAGE_DICE,
  DAMAGE_TYPES,
  DAMAGE_TYPE_LABELS,
  WEAPON_EXTRA_DAMAGE_MAX,
} from 'shared';
import type { ItemFormValues } from '../itemFormValues';
import { EMPTY_DAMAGE_ROW } from './damageRows';

const DIE_OPTIONS = [
  ...DAMAGE_DICE.map((die) => ({ value: `${die}`, label: `к${die}` })),
  { value: 'flat', label: 'число' },
];
const DAMAGE_TYPE_OPTIONS = DAMAGE_TYPES.map((value) => ({
  value,
  label: DAMAGE_TYPE_LABELS[value],
}));

interface DamageRowInputsProps {
  form: UseFormReturnType<ItemFormValues>;
  paths: { count: string; die: string; type: string };
  // Подписи только у основного урона; у строк дополнительного — aria-label.
  labelled: boolean;
  name: string;
}

function DamageRowInputs({
  form,
  paths,
  labelled,
  name,
}: DamageRowInputsProps) {
  return (
    <>
      <NumberInput
        label={labelled ? 'Урон' : undefined}
        aria-label={labelled ? undefined : `${name}: количество`}
        required={labelled}
        min={1}
        allowDecimal={false}
        allowNegative={false}
        w={80}
        {...form.getInputProps(paths.count)}
      />
      <Select
        label={labelled ? 'Кубик' : undefined}
        aria-label={`${name}: кубик`}
        data={DIE_OPTIONS}
        allowDeselect={false}
        w={96}
        {...form.getInputProps(paths.die)}
      />
      <Select
        label={labelled ? 'Тип урона' : undefined}
        aria-label={labelled ? undefined : `${name}: тип`}
        required={labelled}
        placeholder="Выберите"
        data={DAMAGE_TYPE_OPTIONS}
        allowDeselect={false}
        style={{ flex: 1, minWidth: 0 }}
        {...form.getInputProps(paths.type)}
      />
    </>
  );
}

interface DamageFieldsProps {
  form: UseFormReturnType<ItemFormValues>;
}

// Урон оружия (вариант Б доработки макета): основной — к нему прибавляются модификатор
// характеристики и бонус магии, ниже до двух частей дополнительного урона без них.
function DamageFields({ form }: DamageFieldsProps) {
  const extra = form.values.weapon.extraDamage;
  return (
    <Stack gap="xs">
      <Group gap="xs" align="flex-start" wrap="nowrap">
        <DamageRowInputs
          form={form}
          paths={{
            count: 'weapon.damageCount',
            die: 'weapon.damageDie',
            type: 'weapon.damageType',
          }}
          labelled
          name="Урон"
        />
      </Group>
      {extra.length > 0 && (
        <Stack gap={4}>
          <div>
            <Text size="sm" fw={500}>
              Дополнительный урон
            </Text>
            <Text size="xs" c="dimmed">
              Без модификатора характеристики и бонуса магии
            </Text>
          </div>
          {extra.map((_, index) => {
            const path = `weapon.extraDamage.${index}`;
            return (
              <Group key={index} gap="xs" align="flex-start" wrap="nowrap">
                <DamageRowInputs
                  form={form}
                  paths={{
                    count: `${path}.count`,
                    die: `${path}.die`,
                    type: `${path}.type`,
                  }}
                  labelled={false}
                  name={`Дополнительный урон ${index + 1}`}
                />
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="lg"
                  aria-label={`Убрать дополнительный урон ${index + 1}`}
                  onClick={() =>
                    form.removeListItem('weapon.extraDamage', index)
                  }
                >
                  <IconX size={16} />
                </ActionIcon>
              </Group>
            );
          })}
        </Stack>
      )}
      {extra.length < WEAPON_EXTRA_DAMAGE_MAX && (
        <Button
          variant="subtle"
          size="xs"
          leftSection={<IconPlus size={14} />}
          style={{ alignSelf: 'flex-start' }}
          onClick={() =>
            form.insertListItem('weapon.extraDamage', { ...EMPTY_DAMAGE_ROW })
          }
        >
          Дополнительный урон
        </Button>
      )}
    </Stack>
  );
}

export default DamageFields;
