import { Group, SegmentedControl, Text } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { useCallback, useState } from 'react';
import type { Skill } from 'shared';
import { SKILL_LABELS } from '../../characterLabels';
import type { CharacterFormValues } from '../../characterFormValues';
import { formatModifier, getSkillBonus } from './abilityMath';

interface SkillRowProps {
  form: UseFormReturnType<CharacterFormValues>;
  skill: Skill;
  score: number;
  proficiencyBonus: number;
}

type SkillState = 'none' | 'proficient' | 'expertise';

function toSkillState(proficient: boolean, expertise: boolean): SkillState {
  if (proficient && expertise) return 'expertise';
  if (proficient) return 'proficient';
  return 'none';
}

const SEGMENTS = [
  { value: 'none', label: '—' },
  { value: 'proficient', label: 'Вл.' },
  { value: 'expertise', label: 'Эксп.' },
];

// Владение и экспертиза — один трёхпозиционный переключатель, а не два независимых
// чекбокса: экспертиза без владения правилами не предусмотрена, и один контрол вместо
// двух исключает сам рассинхрон (а не просто блокирует его последствия визуально).
function SkillRow({ form, skill, score, proficiencyBonus }: SkillRowProps) {
  const [state, setState] = useState<SkillState>(() =>
    toSkillState(
      form.getValues().skills[skill].proficient,
      form.getValues().skills[skill].expertise,
    ),
  );
  form.watch(
    `skills.${skill}`,
    useCallback(
      ({ value }: { value: { proficient: boolean; expertise: boolean } }) =>
        setState(toSkillState(value.proficient, value.expertise)),
      [],
    ),
  );

  const handleChange = (value: string) => {
    const next = value as SkillState;
    form.setFieldValue(`skills.${skill}`, {
      proficient: next !== 'none',
      expertise: next === 'expertise',
    });
  };

  const bonus = getSkillBonus(
    score,
    state !== 'none',
    state === 'expertise',
    proficiencyBonus,
  );

  return (
    <Group justify="space-between" wrap="nowrap" gap="xs">
      <Text size="sm" style={{ flex: 1 }}>
        {SKILL_LABELS[skill]}
      </Text>
      <SegmentedControl
        size="xs"
        value={state}
        onChange={handleChange}
        data={SEGMENTS}
        aria-label={SKILL_LABELS[skill]}
      />
      <Text w={32} ta="right" fw={600}>
        {formatModifier(bonus)}
      </Text>
    </Group>
  );
}

export default SkillRow;
