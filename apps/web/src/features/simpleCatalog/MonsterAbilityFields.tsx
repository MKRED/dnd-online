import { Group, NumberInput, Select } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import {
  RECHARGE_MAX,
  RECHARGE_MIN,
  USES_AMOUNT_MAX,
  type MonsterLimitKind,
} from 'shared';
import type { SimpleFormValues } from './SimpleEntryForm/simpleEntryValues';

const LIMIT_OPTIONS: { value: MonsterLimitKind; label: string }[] = [
  { value: 'none', label: 'Нет' },
  { value: 'per_day', label: 'N/день' },
  { value: 'recharge', label: 'Перезарядка X–6' },
  { value: 'rest', label: 'Перезарядка после короткого или долгого отдыха' },
];

const RECHARGE_OPTIONS = Array.from(
  { length: RECHARGE_MAX - RECHARGE_MIN + 1 },
  (_, i) => {
    const from = RECHARGE_MIN + i;
    const value = String(from);
    return { value, label: from === RECHARGE_MAX ? '6' : `${from}–6` };
  },
);

// Подсказка под видом: как это работает по книге 2024 (docs/dnd/monsters.md, «Usage limits»).
const HINTS: Record<MonsterLimitKind, string> = {
  none: 'Как в стат-блоке: N/день, перезарядка или после отдыха',
  per_day: 'Столько раз, потом — после долгого отдыха',
  recharge:
    'Один раз; в начале хода монстр бросает к6 и при этом числе или выше применяет снова',
  rest: 'Один раз, снова — после короткого или долгого отдыха',
};

// «Ограничение» способности монстра (docs/plan/ability-categories.md, вариант 1А) — вместо
// «Зарядов» и отдельной перезарядки. У черты его нет: AbilityFields его не показывает.
function MonsterAbilityFields({
  form,
}: {
  form: UseFormReturnType<SimpleFormValues>;
}) {
  const { limit } = form.getValues().monster;
  return (
    <Group gap="xs" align="flex-end" wrap="wrap">
      <Select
        label="Ограничение"
        description={HINTS[limit]}
        data={LIMIT_OPTIONS}
        allowDeselect={false}
        w={320}
        maw="100%"
        {...form.getInputProps('monster.limit')}
      />
      {limit === 'per_day' && (
        <NumberInput
          aria-label="Раз в день"
          min={1}
          max={USES_AMOUNT_MAX}
          allowDecimal={false}
          allowNegative={false}
          rightSection="/день"
          rightSectionWidth={52}
          w={110}
          {...form.getInputProps('monster.perDay')}
        />
      )}
      {limit === 'recharge' && (
        <Select
          aria-label="Перезарядка"
          data={RECHARGE_OPTIONS}
          allowDeselect={false}
          w={96}
          {...form.getInputProps('monster.recharge')}
        />
      )}
    </Group>
  );
}

export default MonsterAbilityFields;
