import { Select, Stack, Text } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { useCallback, useState } from 'react';
import { ABILITY_SCORES, spellcastingNumbers, type AbilityScore } from 'shared';
import type { CharacterFormValues } from '../characterFormValues';
import { ABILITY_LABELS } from '../characterLabels';
import { formatModifier } from './AbilityScoresSection/abilityMath';

const OPTIONS = [
  { value: 'none', label: 'Не колдует' },
  ...ABILITY_SCORES.map((ability) => ({
    value: ability,
    label: ABILITY_LABELS[ability],
  })),
];

type Watched = Pick<
  CharacterFormValues,
  'spellcastingAbility' | 'abilityScores' | 'proficiencyBonus'
>;

// Заклинательная характеристика (docs/dnd/spells.md): одна на персонажа, у мультикласса —
// основная. Под ней — атака заклинанием и Сл спасброска из текущих чисел формы: форма
// uncontrolled, поэтому нужные поля слушаются через watch, как в AbilityCard.
function SpellcastingField({
  form,
}: {
  form: UseFormReturnType<CharacterFormValues>;
}) {
  const [watched, setWatched] = useState<Watched>(() => {
    const values = form.getValues();
    return {
      spellcastingAbility: values.spellcastingAbility,
      abilityScores: values.abilityScores,
      proficiencyBonus: values.proficiencyBonus,
    };
  });
  const keep = useCallback(
    (patch: Partial<Watched>) => setWatched((prev) => ({ ...prev, ...patch })),
    [],
  );
  form.watch(
    'spellcastingAbility',
    useCallback(
      ({ value }: { value: AbilityScore | 'none' }) =>
        keep({ spellcastingAbility: value }),
      [keep],
    ),
  );
  // NumberInput отдаёт '' во время правки — держим последнее число.
  form.watch(
    'proficiencyBonus',
    useCallback(
      ({ value }: { value: number | string }) => {
        if (typeof value === 'number' && Number.isFinite(value)) {
          keep({ proficiencyBonus: value });
        }
      },
      [keep],
    ),
  );
  // Родительский путь срабатывает и на правку одной характеристики.
  form.watch(
    'abilityScores',
    useCallback(
      ({ value }: { value: Record<AbilityScore, number | string> }) => {
        if (Object.values(value).every((v) => typeof v === 'number')) {
          keep({ abilityScores: value as Record<AbilityScore, number> });
        }
      },
      [keep],
    ),
  );

  const ability = watched.spellcastingAbility;
  const numbers = spellcastingNumbers({
    spellcastingAbility: ability === 'none' ? null : ability,
    abilityScores: watched.abilityScores,
    proficiencyBonus: watched.proficiencyBonus,
  });
  return (
    <Stack gap={6}>
      <Select
        label="Заклинательная характеристика"
        data={OPTIONS}
        allowDeselect={false}
        maw={260}
        {...form.getInputProps('spellcastingAbility')}
      />
      <Text size="sm" c="dimmed">
        Её задаёт класс; у мультикласса выберите основную. От неё считаются
        атака заклинанием и Сл спасброска.
      </Text>
      {numbers && (
        <Text size="sm">
          Атака заклинанием {formatModifier(numbers.attack)} · Сл спасброска{' '}
          {numbers.saveDc}
        </Text>
      )}
    </Stack>
  );
}

export default SpellcastingField;
