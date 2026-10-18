import { Checkbox, Input, SegmentedControl, Stack, Text } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import type { AbilityCheckKind } from 'shared';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';
import DamageRows from './DamageRows';
import type { EffectCandidates } from './effectOptions';
import EffectRows from './EffectRows';

// «При попадании», «При успехе»: исходы атаки и спасброска. Без проверки исход один —
// «Последствия»: урон и эффекты, которые просто случаются.
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
  // Эффекты для выбора — одни на всю форму (StepsField).
  candidates: EffectCandidates | null;
}

// Последствия шага: строки урона при попадании или провале (кости + число, тип),
// модификатор характеристики атаки один раз на весь урон, эффекты из каталога (этап 8) и
// что бывает при промахе или успехе — половина урона и свои эффекты. Без проверки второго
// исхода нет.
function DamageFields({ form, index, candidates }: DamageFieldsProps) {
  const path = `steps.${index}`;
  const step = form.getValues().steps[index];
  const { damage } = step;
  const cases = OUTCOME_CASES[step.check];
  const modifier = step.check === 'attack' && step.bonusKind === 'ability';
  const errorOf = (field: string) => {
    const error = form.errors[`${path}.${field}`];
    return typeof error === 'string' ? error : undefined;
  };

  return (
    <Stack gap="xs">
      <Input.Wrapper label={cases ? `При ${cases.hit}` : 'Последствия'}>
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
          <EffectRows
            form={form}
            path={`${path}.hitEffects`}
            rows={step.hitEffects}
            candidates={candidates}
            error={errorOf('hitEffects')}
          />
        </Stack>
      </Input.Wrapper>
      {cases && (
        <Input.Wrapper label={`При ${cases.miss}`}>
          <Stack gap="xs" mt={4}>
            {damage.length > 0 && (
              <div>
                <SegmentedControl
                  aria-label={`При ${cases.miss}`}
                  data={MISS_OPTIONS}
                  size="xs"
                  {...form.getInputProps(`${path}.onMiss`)}
                />
              </div>
            )}
            <EffectRows
              form={form}
              path={`${path}.missEffects`}
              rows={step.missEffects}
              candidates={candidates}
              error={errorOf('missEffects')}
            />
          </Stack>
        </Input.Wrapper>
      )}
    </Stack>
  );
}

export default DamageFields;
