import {
  Checkbox,
  Group,
  NumberInput,
  Paper,
  Stack,
  Text,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { useCallback, useState } from 'react';
import {
  ABILITY_SCORES,
  SKILL_ABILITIES,
  type AbilityScore,
  type Skill,
} from 'shared';
import { ABILITY_LABELS } from '../../characterLabels';
import type { CharacterFormValues } from '../../characterFormValues';
import {
  formatModifier,
  getAbilityModifier,
  getSavingThrowBonus,
} from './abilityMath';
import SkillRow from './SkillRow';

interface AbilityCardProps {
  form: UseFormReturnType<CharacterFormValues>;
  ability: AbilityScore;
  proficiencyBonus: number;
}

const SKILLS_BY_ABILITY = (Object.keys(SKILL_ABILITIES) as Skill[]).reduce<
  Record<AbilityScore, Skill[]>
>(
  (acc, skill) => {
    acc[SKILL_ABILITIES[skill]].push(skill);
    return acc;
  },
  ABILITY_SCORES.reduce<Record<AbilityScore, Skill[]>>(
    (acc, ability) => {
      acc[ability] = [];
      return acc;
    },
    {} as Record<AbilityScore, Skill[]>,
  ),
);

// Следит только за своей характеристикой (значение + спасбросок) — соседние карточки
// на её изменения не реагируют. proficiencyBonus — общее для всех, приходит пропом сверху.
function AbilityCard({ form, ability, proficiencyBonus }: AbilityCardProps) {
  const [score, setScore] = useState(
    () => form.getValues().abilityScores[ability],
  );
  const [savingThrowProficient, setSavingThrowProficient] = useState(
    () => form.getValues().savingThrows[ability],
  );
  form.watch(
    `abilityScores.${ability}`,
    // NumberInput отдаёт '' во время редактирования (до blur/clamp к min) — не сбрасываем
    // расчёты на этот момент, а держим последнее валидное значение.
    useCallback(({ value }: { value: number | string }) => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        setScore(value);
      }
    }, []),
  );
  form.watch(
    `savingThrows.${ability}`,
    useCallback(
      ({ value }: { value: boolean }) => setSavingThrowProficient(value),
      [],
    ),
  );

  const modifier = getAbilityModifier(score);
  const savingThrowBonus = getSavingThrowBonus(
    score,
    savingThrowProficient,
    proficiencyBonus,
  );

  return (
    <Paper withBorder p="sm" radius="md">
      <Stack gap={6}>
        <Group justify="space-between" align="flex-end" wrap="nowrap">
          <NumberInput
            label={ABILITY_LABELS[ability]}
            min={1}
            max={30}
            w={100}
            {...form.getInputProps(`abilityScores.${ability}`)}
          />
          <Text size="xl" fw={700}>
            {formatModifier(modifier)}
          </Text>
        </Group>
        <Group gap={6} wrap="nowrap">
          <Checkbox
            label="Спасбросок"
            {...form.getInputProps(`savingThrows.${ability}`, {
              type: 'checkbox',
            })}
          />
          <Text fw={600} ml="auto">
            {formatModifier(savingThrowBonus)}
          </Text>
        </Group>
        <Stack gap={4}>
          {SKILLS_BY_ABILITY[ability].map((skill) => (
            <SkillRow
              key={skill}
              form={form}
              skill={skill}
              score={score}
              proficiencyBonus={proficiencyBonus}
            />
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}

export default AbilityCard;
