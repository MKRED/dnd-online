import { Checkbox, Group, NumberInput, Select, Stack } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import {
  FEET_STEP,
  RANGE_FEET_MAX,
  REACH_FEET_MAX,
  STEP_TARGET_LABELS,
  stepTargets,
} from 'shared';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';
import AreaFields from './AreaFields';
import { checkOf } from './stepsForm';

interface TargetFieldsProps {
  form: UseFormReturnType<SimpleFormValues>;
  index: number;
}

// Футы кратны 5 — клетка карты.
const feetProps = (max: number) => ({
  min: FEET_STEP,
  max,
  step: FEET_STEP,
  allowDecimal: false,
  allowNegative: false,
});

// Цель шага: на выбор только то, что подходит проверке (stepTargets), и поля этой цели.
function TargetFields({ form, index }: TargetFieldsProps) {
  const path = `steps.${index}`;
  const step = form.getValues().steps[index];
  const options = stepTargets(checkOf(step)).map((value) => ({
    value,
    label: STEP_TARGET_LABELS[value],
  }));
  const rangedWeapon =
    step.check === 'attack' && step.attack === 'ranged_weapon';

  return (
    <Stack gap="xs">
      <Group gap="xs" align="flex-start" wrap="wrap">
        <Select
          label="Цель"
          data={options}
          allowDeselect={false}
          w={180}
          {...form.getInputProps(`${path}.target`)}
        />
        {step.target === 'reach' && (
          <NumberInput
            label="Досягаемость, фт."
            {...feetProps(REACH_FEET_MAX)}
            w={130}
            {...form.getInputProps(`${path}.reachFeet`)}
          />
        )}
        {step.target === 'range' && (
          <NumberInput
            label="Дистанция, фт."
            {...feetProps(RANGE_FEET_MAX)}
            w={130}
            {...form.getInputProps(`${path}.rangeFeet`)}
          />
        )}
        {step.target === 'range' && rangedWeapon && step.longOn && (
          <NumberInput
            label="Дальняя, фт."
            description="С помехой"
            {...feetProps(RANGE_FEET_MAX)}
            w={130}
            {...form.getInputProps(`${path}.longFeet`)}
          />
        )}
      </Group>
      {step.target === 'range' && rangedWeapon && (
        <Checkbox
          label="Есть дальняя дистанция, как у лука: 150/600"
          {...form.getInputProps(`${path}.longOn`, { type: 'checkbox' })}
        />
      )}
      {step.target === 'area' && <AreaFields form={form} index={index} />}
    </Stack>
  );
}

export default TargetFields;
