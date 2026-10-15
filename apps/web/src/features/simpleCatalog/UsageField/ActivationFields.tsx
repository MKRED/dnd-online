import { Group, NumberInput, Select, Stack, TextInput } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import {
  ABILITY_ACTIVATION_KINDS,
  ABILITY_TRIGGER_MAX_LENGTH,
  ACTIVATION_AMOUNT_MAX,
  ACTIVATION_LABELS,
  pluralRu,
  type AbilityActivationKind,
} from 'shared';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';

const KIND_OPTIONS = ABILITY_ACTIVATION_KINDS.map((value) => ({
  value,
  label: ACTIVATION_LABELS[value],
}));

// Подсказка под видом: пример из книги (docs/dnd/ability-usage.md).
const KIND_HINTS: Record<AbilityActivationKind, string> = {
  action: 'Основное действие хода: удар, заклинание',
  bonus_action: 'Одно за ход, только если способность это позволяет: «Ярость»',
  reaction: 'Одна до начала вашего следующего хода, в ответ на событие',
  free: 'Не тратит ни действия, ни реакции: «Удача» полурослика',
  attack: 'Заменяет одну из атак действия «Атака», как оружие дыхания',
  time: 'Дольше одного хода: 1 минута, 10 минут, 1 час',
};

interface ActivationFieldsProps {
  form: UseFormReturnType<SimpleFormValues>;
}

// Как применяют способность: вид и поля этого вида.
function ActivationFields({ form }: ActivationFieldsProps) {
  const { kind, amount } = form.getValues().usage;
  const count = Number(amount) || 1;

  return (
    <Stack gap="xs">
      <Select
        label="Активация"
        description={KIND_HINTS[kind]}
        data={KIND_OPTIONS}
        allowDeselect={false}
        maw={320}
        {...form.getInputProps('usage.kind')}
      />
      {(kind === 'reaction' || kind === 'free') && (
        <TextInput
          label="Условие"
          placeholder={
            kind === 'reaction'
              ? 'когда по вам попадает видимый враг'
              : 'когда на к20 выпадает 1'
          }
          maxLength={ABILITY_TRIGGER_MAX_LENGTH}
          {...form.getInputProps('usage.trigger')}
        />
      )}
      {kind === 'time' && (
        <Group gap="xs" align="flex-start" wrap="nowrap">
          <NumberInput
            aria-label="Сколько"
            min={1}
            max={ACTIVATION_AMOUNT_MAX}
            allowDecimal={false}
            allowNegative={false}
            w={96}
            {...form.getInputProps('usage.amount')}
          />
          <Select
            aria-label="Единица времени"
            data={[
              {
                value: 'minute',
                label: pluralRu(count, ['минута', 'минуты', 'минут']),
              },
              {
                value: 'hour',
                label: pluralRu(count, ['час', 'часа', 'часов']),
              },
            ]}
            allowDeselect={false}
            w={140}
            {...form.getInputProps('usage.unit')}
          />
        </Group>
      )}
    </Stack>
  );
}

export default ActivationFields;
