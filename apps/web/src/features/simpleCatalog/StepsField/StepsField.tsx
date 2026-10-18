import {
  ActionIcon,
  Alert,
  Button,
  Group,
  Input,
  Paper,
  Stack,
  Text,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { useEffect } from 'react';
import { ABILITY_STEPS_MAX } from 'shared';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';
import CheckFields from './CheckFields';
import { formGrowthBasis } from '../abilityInput';
import DamageFields from './DamageFields';
import GrowthFields from './GrowthFields';
import { chainLinks, chainSteps } from './stepChain';
import { newStep } from './stepsForm';
import TargetFields from './TargetFields';
import { useEffectCandidates } from './useEffectCandidates';
import WhenField from './WhenField';

interface StepsFieldProps {
  form: UseFormReturnType<SimpleFormValues>;
}

// «Применение» способности (docs/plan/abilities.md): шаги карточками, как составляющие
// эффекта. Шаг 2 и дальше опирается на прошлый: «когда» и его цели (stepChain.ts).
function StepsField({ form }: StepsFieldProps) {
  const { steps } = form.getValues();
  const full = steps.length >= ABILITY_STEPS_MAX;
  const links = chainLinks(steps);
  const numbered = steps.length > 1;
  const basis = formGrowthBasis(form.getValues());
  // Эффекты для исходов — один запрос на форму, а не в каждом шаге.
  const { candidates, error } = useEffectCandidates();

  // Правка одного шага может сделать неверным следующий: прошлый стал без проверки —
  // «при попадании» больше нет; удалили первый — у нового первого нет «той же цели».
  // Поправляем после отрисовки, по порядку шагов.
  useEffect(() => {
    const fixed = chainSteps(steps);
    if (fixed.some((step, index) => step !== steps[index]))
      form.setFieldValue('steps', fixed);
  }, [steps, form]);

  return (
    <Input.Wrapper
      label="Применение"
      description="Как способность действует на цель. Без шагов — всё в описании"
    >
      <Stack gap="xs" mt={6}>
        {error && (
          <Alert color="red" variant="light" p="xs">
            {error}
          </Alert>
        )}
        {steps.map((step, index) => (
          <Paper key={step.key} withBorder p="sm" radius="md">
            <Group justify="space-between" mb={4} wrap="nowrap">
              <Text size="sm" fw={500}>
                {numbered ? `Шаг ${index + 1}` : 'Шаг'}
              </Text>
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label="Убрать шаг"
                title="Убрать шаг"
                onClick={() => form.removeListItem('steps', index)}
              >
                ✕
              </ActionIcon>
            </Group>
            <Stack gap="sm">
              {links[index] && (
                <WhenField form={form} index={index} link={links[index]} />
              )}
              <CheckFields form={form} index={index} link={links[index]} />
              <TargetFields form={form} index={index} link={links[index]} />
              <DamageFields form={form} index={index} candidates={candidates} />
              <GrowthFields form={form} index={index} basis={basis} />
            </Stack>
          </Paper>
        ))}
        {!full && (
          <Button
            variant="light"
            size="xs"
            w="fit-content"
            // Шаг 2 и дальше чаще всего бьёт ту же цель («Ледяной кинжал»); если она не
            // подходит, цепочка подберёт другую.
            onClick={() =>
              form.insertListItem('steps', {
                ...newStep(),
                ...(steps.length > 0 ? { target: 'previous' } : {}),
              })
            }
          >
            + Шаг
          </Button>
        )}
      </Stack>
    </Input.Wrapper>
  );
}

export default StepsField;
