import {
  Group,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import {
  AREA_FEET_MAX,
  AREA_MAIN_SIZE_LABELS,
  AREA_SHAPE_LABELS,
  AREA_SHAPES,
  FEET_STEP,
  RANGE_FEET_MAX,
} from 'shared';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';

const SHAPE_OPTIONS = AREA_SHAPES.map((value) => ({
  value,
  label: AREA_SHAPE_LABELS[value],
}));
const ORIGIN_OPTIONS = [
  { value: 'point', label: 'В точке на дистанции' },
  { value: 'self', label: 'От себя' },
];
const feetProps = (max: number) => ({
  min: FEET_STEP,
  max,
  step: FEET_STEP,
  allowDecimal: false,
  allowNegative: false,
  w: 130,
});

interface AreaFieldsProps {
  form: UseFormReturnType<SimpleFormValues>;
  index: number;
}

// Область: фигура, её размеры по книге и откуда она — от себя или из точки на
// дистанции. Эманация всегда от себя, поэтому у неё вопроса нет.
function AreaFields({ form, index }: AreaFieldsProps) {
  const path = `steps.${index}`;
  const step = form.getValues().steps[index];
  const { areaShape } = step;
  const emanation = areaShape === 'emanation';

  return (
    <Stack gap="xs">
      <Group gap="xs" align="flex-start" wrap="wrap">
        <Select
          label="Фигура"
          data={SHAPE_OPTIONS}
          allowDeselect={false}
          w={150}
          {...form.getInputProps(`${path}.areaShape`)}
        />
        <NumberInput
          label={`${AREA_MAIN_SIZE_LABELS[areaShape]}, фт.`}
          {...feetProps(AREA_FEET_MAX)}
          {...form.getInputProps(`${path}.areaSize`)}
        />
        {areaShape === 'cylinder' && (
          <NumberInput
            label="Высота, фт."
            {...feetProps(AREA_FEET_MAX)}
            {...form.getInputProps(`${path}.areaHeight`)}
          />
        )}
        {areaShape === 'line' && (
          <NumberInput
            label="Ширина, фт."
            {...feetProps(AREA_FEET_MAX)}
            {...form.getInputProps(`${path}.areaWidth`)}
          />
        )}
      </Group>
      {!emanation && (
        <Group gap="xs" align="flex-end" wrap="wrap">
          <SegmentedControl
            aria-label="Откуда область"
            data={ORIGIN_OPTIONS}
            size="xs"
            {...form.getInputProps(`${path}.originKind`)}
          />
          {step.originKind === 'point' && (
            <NumberInput
              aria-label="Дистанция до точки, фт."
              suffix=" фт."
              size="xs"
              {...feetProps(RANGE_FEET_MAX)}
              {...form.getInputProps(`${path}.originFeet`)}
            />
          )}
        </Group>
      )}
    </Stack>
  );
}

export default AreaFields;
