import {
  Group,
  Input,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  TextInput,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import {
  ABILITY_ACTIVATION_KINDS,
  ABILITY_TRIGGER_MAX_LENGTH,
  ACTIVATION_AMOUNT_MAX,
  ACTIVATION_LABELS,
  LEGENDARY_COST_MAX,
  MONSTER_ACTIVATION_KINDS,
  pluralRu,
  type AbilityActivationKind,
} from 'shared';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';

const monsterOnly: readonly AbilityActivationKind[] = MONSTER_ACTIVATION_KINDS;

const kindOption = (value: AbilityActivationKind) => ({
  value,
  label: ACTIVATION_LABELS[value],
});

// Черта и легендарное действие — только у способности монстра (shared/abilityMonster.ts).
const ALL_OPTIONS = ABILITY_ACTIVATION_KINDS.map(kindOption);
const COMMON_OPTIONS = ABILITY_ACTIVATION_KINDS.filter(
  (kind) => !monsterOnly.includes(kind),
).map(kindOption);

const COST_OPTIONS = Array.from({ length: LEGENDARY_COST_MAX }, (_, i) =>
  String(i + 1),
);

// Подсказка под видом: пример из книги (docs/dnd/ability-usage.md).
const KIND_HINTS: Record<AbilityActivationKind, string> = {
  action: 'Основное действие хода: удар, заклинание',
  bonus_action: 'Одно за ход, только если способность это позволяет: «Ярость»',
  reaction: 'Одна до начала вашего следующего хода, в ответ на событие',
  free: 'Не тратит ни действия, ни реакции: «Удача» полурослика',
  attack: 'Заменяет одну из атак действия «Атака», как оружие дыхания',
  time: 'Дольше одного хода: 1 минута, 10 минут, 1 час',
  trait:
    'Действует всегда или в своих условиях: «Амфибия», «Легендарное сопротивление»',
  legendary:
    'Сразу после хода другого существа, из запаса легендарных действий на раунд',
};

interface ActivationFieldsProps {
  form: UseFormReturnType<SimpleFormValues>;
}

// Как применяют способность: вид и поля этого вида.
function ActivationFields({ form }: ActivationFieldsProps) {
  const { category, usage } = form.getValues();
  const { kind, amount } = usage;
  const count = Number(amount) || 1;

  return (
    <Stack gap="xs">
      <Select
        label="Активация"
        description={KIND_HINTS[kind]}
        data={category === 'monster' ? ALL_OPTIONS : COMMON_OPTIONS}
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
      {kind === 'legendary' && (
        <Input.Wrapper
          label="Цена"
          description="Сколько легендарных действий тратит. По книге 2024 — всегда 1, больше бывает у монстров из книг 2014 года"
        >
          <SegmentedControl
            aria-label="Цена"
            data={COST_OPTIONS}
            mt={4}
            {...form.getInputProps('usage.legendaryCost')}
          />
        </Input.Wrapper>
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
