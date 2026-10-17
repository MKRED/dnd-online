import { Checkbox, Group, NumberInput, Select, Stack } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import {
  AROUND_FEET_MAX,
  FEET_STEP,
  RANGE_FEET_MAX,
  REACH_FEET_MAX,
  STEP_TARGET_LABELS,
  STEP_TIMES_MAX,
  stepTargets,
  type StepLink,
} from 'shared';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';
import AreaFields from './AreaFields';
import { checkOf } from './stepsForm';

interface TargetFieldsProps {
  form: UseFormReturnType<SimpleFormValues>;
  index: number;
  link: StepLink | null;
}

// Футы кратны 5 — клетка карты.
const feetProps = (max: number) => ({
  min: FEET_STEP,
  max,
  step: FEET_STEP,
  allowDecimal: false,
  allowNegative: false,
});

// Цель шага: на выбор только то, что подходит проверке и прошлому шагу (stepTargets),
// поля этой цели и сколько раз шаг повторяется.
function TargetFields({ form, index, link }: TargetFieldsProps) {
  const path = `steps.${index}`;
  const step = form.getValues().steps[index];
  const options = stepTargets(checkOf(step), link).map((value) => ({
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
          w={200}
          {...form.getInputProps(`${path}.target`)}
        />
        {step.target === 'around' && (
          <NumberInput
            label="Вокруг неё, фт."
            {...feetProps(AROUND_FEET_MAX)}
            w={130}
            {...form.getInputProps(`${path}.aroundFeet`)}
          />
        )}
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
        <NumberInput
          label="Сколько раз"
          // Пояснение подсказкой: описание под подписью сдвинуло бы поле ниже соседних.
          title="Лучи, дротики: каждый раз свой бросок, цели выбирают при применении"
          min={1}
          max={STEP_TIMES_MAX}
          allowDecimal={false}
          allowNegative={false}
          w={110}
          {...form.getInputProps(`${path}.times`)}
        />
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
