import {
  ActionIcon,
  Button,
  Group,
  Input,
  Paper,
  Stack,
  Text,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { ABILITY_STEPS_MAX } from 'shared';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';
import CheckFields from './CheckFields';
import DamageFields from './DamageFields';
import { newStep } from './stepsForm';
import TargetFields from './TargetFields';

interface StepsFieldProps {
  form: UseFormReturnType<SimpleFormValues>;
}

// «Применение» способности (docs/plan/abilities.md): шаги карточками, как составляющие
// эффекта. Пока шаг один; несколько шагов — этап 5.
function StepsField({ form }: StepsFieldProps) {
  const { steps } = form.getValues();
  const full = steps.length >= ABILITY_STEPS_MAX;

  return (
    <Input.Wrapper
      label="Применение"
      description="Как способность действует на цель. Без шагов — всё в описании"
    >
      <Stack gap="xs" mt={6}>
        {steps.map((step, index) => (
          <Paper key={step.key} withBorder p="sm" radius="md">
            <Group justify="space-between" mb={4} wrap="nowrap">
              <Text size="sm" fw={500}>
                Шаг
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
              <CheckFields form={form} index={index} />
              <TargetFields form={form} index={index} />
              <DamageFields form={form} index={index} />
            </Stack>
          </Paper>
        ))}
        {!full && (
          <Button
            variant="light"
            size="xs"
            w="fit-content"
            onClick={() => form.insertListItem('steps', newStep())}
          >
            + Шаг
          </Button>
        )}
      </Stack>
    </Input.Wrapper>
  );
}

export default StepsField;
