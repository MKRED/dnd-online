import { Checkbox, Input, SegmentedControl, Stack, Text } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import type { AbilityCheckKind } from 'shared';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';
import DamageRows from './DamageRows';

// «При попадании», «При успехе»: исходы атаки и спасброска. Без проверки исход один —
// просто «Урон».
const OUTCOME_CASES: Record<
  AbilityCheckKind,
  { hit: string; miss: string } | null
> = {
  attack: { hit: 'попадании', miss: 'промахе' },
  save: { hit: 'провале', miss: 'успехе' },
  none: null,
};
const MISS_OPTIONS = [
  { value: 'none', label: 'Ничего' },
  { value: 'half', label: 'Половина урона' },
];

interface DamageFieldsProps {
  form: UseFormReturnType<SimpleFormValues>;
  index: number;
}

// Последствия шага: строки урона при попадании или провале (кости + число, тип),
// модификатор характеристики атаки один раз на весь урон и что бывает при промахе или
// успехе. Без проверки второго исхода нет.
function DamageFields({ form, index }: DamageFieldsProps) {
  const path = `steps.${index}`;
  const step = form.getValues().steps[index];
  const { damage } = step;
  const cases = OUTCOME_CASES[step.check];
  const modifier = step.check === 'attack' && step.bonusKind === 'ability';

  return (
    <Stack gap="xs">
      <Input.Wrapper label={cases ? `При ${cases.hit}` : 'Урон'}>
        <Stack gap="xs" mt={4}>
          {damage.length === 0 && (
            <Text size="sm" c="dimmed">
              Без урона
            </Text>
          )}
          <DamageRows
            form={form}
            path={`${path}.damage`}
            rows={damage}
            addLabel="+ Урон"
          />
          {modifier && (
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
      {damage.length > 0 && cases && (
        <Input.Wrapper label={`При ${cases.miss}`}>
          <div>
            <SegmentedControl
              aria-label={`При ${cases.miss}`}
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
