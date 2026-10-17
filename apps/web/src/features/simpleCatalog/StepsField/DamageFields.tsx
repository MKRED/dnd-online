import {
  ActionIcon,
  Button,
  Checkbox,
  Group,
  Input,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
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
import { newDamage } from './stepsForm';

const DIE_OPTIONS = DAMAGE_DICE.map((die) => ({
  value: String(die),
  label: `d${die}`,
}));
const TYPE_OPTIONS = DAMAGE_TYPES.map((value) => ({
  value,
  label: DAMAGE_TYPE_LABELS[value],
}));
const MISS_OPTIONS = [
  { value: 'none', label: 'Ничего' },
  { value: 'half', label: 'Половина урона' },
];

interface DamageFieldsProps {
  form: UseFormReturnType<SimpleFormValues>;
  index: number;
}

// Последствия атаки: строки урона при попадании (кости + число, тип), модификатор
// характеристики один раз на весь урон и что бывает при промахе.
function DamageFields({ form, index }: DamageFieldsProps) {
  const path = `steps.${index}`;
  const step = form.getValues().steps[index];
  const { damage } = step;
  const lastType = damage.at(-1)?.type;

  return (
    <Stack gap="xs">
      <Input.Wrapper label="При попадании">
        <Stack gap="xs" mt={4}>
          {damage.length === 0 && (
            <Text size="sm" c="dimmed">
              Без урона
            </Text>
          )}
          {damage.map((part, row) => (
            <Group key={part.key} gap="xs" align="flex-start" wrap="wrap">
              <Group gap="xs" align="flex-start" wrap="nowrap">
                <NumberInput
                  aria-label="Сколько костей"
                  min={0}
                  max={DAMAGE_DICE_MAX}
                  allowDecimal={false}
                  allowNegative={false}
                  w={64}
                  {...form.getInputProps(`${path}.damage.${row}.count`)}
                />
                <Select
                  aria-label="Кость"
                  data={DIE_OPTIONS}
                  allowDeselect={false}
                  w={76}
                  {...form.getInputProps(`${path}.damage.${row}.die`)}
                />
                <Text pt={6}>+</Text>
                <NumberInput
                  aria-label="Число"
                  min={0}
                  max={DAMAGE_NUMBER_MAX}
                  allowDecimal={false}
                  allowNegative={false}
                  w={64}
                  {...form.getInputProps(`${path}.damage.${row}.number`)}
                />
              </Group>
              <Group gap="xs" align="flex-start" wrap="nowrap">
                <Select
                  aria-label="Тип урона"
                  data={TYPE_OPTIONS}
                  allowDeselect={false}
                  w={160}
                  {...form.getInputProps(`${path}.damage.${row}.type`)}
                />
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  mt={4}
                  aria-label="Убрать урон"
                  title="Убрать урон"
                  onClick={() => form.removeListItem(`${path}.damage`, row)}
                >
                  ✕
                </ActionIcon>
              </Group>
            </Group>
          ))}
          {damage.length < DAMAGE_PARTS_MAX && (
            <Button
              variant="subtle"
              size="xs"
              w="fit-content"
              px={4}
              // Вторая строка чаще другого типа, но начинать удобнее с того же.
              onClick={() =>
                form.insertListItem(`${path}.damage`, newDamage(lastType))
              }
            >
              + Урон
            </Button>
          )}
          {step.bonusKind === 'ability' && (
            <Checkbox
              label="Прибавить модификатор характеристики атаки"
              description="Как у оружия; у заклинаний обычно нет"
              {...form.getInputProps(`${path}.addModifier`, {
                type: 'checkbox',
              })}
            />
          )}
        </Stack>
      </Input.Wrapper>
      {damage.length > 0 && (
        <Input.Wrapper label="При промахе">
          <div>
            <SegmentedControl
              aria-label="При промахе"
              data={MISS_OPTIONS}
              size="xs"
              mt={4}
              {...form.getInputProps(`${path}.onMiss`)}
            />
          </div>
        </Input.Wrapper>
      )}
    </Stack>
  );
}

export default DamageFields;
