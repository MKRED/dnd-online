import {
  ActionIcon,
  Button,
  Group,
  NumberInput,
  Stack,
  Text,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { GROWTH_TIMES_MAX, formatGrowthBasis, type GrowthBasis } from 'shared';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';
import { newDamage } from './damageForm';
import DamageRows from './DamageRows';

interface GrowthFieldsProps {
  form: UseFormReturnType<SimpleFormValues>;
  index: number;
  // С чем растёт — решает способность (abilityInput.ts), одно на все шаги.
  basis: GrowthBasis;
}

// Рост шага (этап 7): строки урона и повторы на ступень. Пока не нужен — кнопка
// «+ Рост»: у большинства способностей его нет.
function GrowthFields({ form, index, basis }: GrowthFieldsProps) {
  const path = `steps.${index}`;
  const step = form.getValues().steps[index];

  if (!step.growthOn)
    return (
      <Button
        variant="subtle"
        size="xs"
        w="fit-content"
        px={4}
        // «Огненный шар» 8d6 огнём растёт на 1d6 огнём — та же кость и тип, что у первой
        // строки урона.
        onClick={() => {
          const [first] = step.damage;
          form.setFieldValue(`${path}.growthOn`, true);
          if (first && step.growthDamage.length === 0)
            form.setFieldValue(`${path}.growthDamage`, [
              { ...newDamage(first.type), die: first.die },
            ]);
        }}
      >
        + Рост
      </Button>
    );

  return (
    <Stack gap={6}>
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <div>
          <Text size="sm" fw={500}>
            Рост
          </Text>
          <Text size="xs" c="dimmed">
            {formatGrowthBasis(basis)}
          </Text>
        </div>
        <ActionIcon
          variant="subtle"
          color="gray"
          aria-label="Убрать рост"
          title="Убрать рост"
          onClick={() => form.setFieldValue(`${path}.growthOn`, false)}
        >
          ✕
        </ActionIcon>
      </Group>
      <DamageRows
        form={form}
        path={`${path}.growthDamage`}
        rows={step.growthDamage}
        addLabel="+ Урон к росту"
      />
      <NumberInput
        label="Ещё повторов"
        min={0}
        max={GROWTH_TIMES_MAX}
        allowDecimal={false}
        allowNegative={false}
        w={140}
        {...form.getInputProps(`${path}.growthTimes`)}
      />
    </Stack>
  );
}

export default GrowthFields;
