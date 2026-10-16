import {
  Checkbox,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import {
  isSpecialSpeed,
  SPECIAL_SPEEDS,
  SPEED_CHANGE_LABELS,
  SPEED_CHANGES,
  SPEED_FEET_MAX,
  SPEED_FEET_STEP,
  speedNeedsFeet,
} from 'shared';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';

const option = (value: (typeof SPEED_CHANGES)[number]) => ({
  value,
  label: SPEED_CHANGE_LABELS[value],
});
const CHANGE_OPTIONS = [
  {
    group: 'Обычная Скорость',
    items: SPEED_CHANGES.filter((c) => !isSpecialSpeed(c)).map(option),
  },
  { group: 'Даёт особую скорость', items: SPECIAL_SPEEDS.map(option) },
];
const AMOUNT_OPTIONS = [
  { value: 'feet', label: 'N фт.' },
  { value: 'same', label: 'Равна Скорости' },
];

interface SpeedComponentFieldsProps {
  form: UseFormReturnType<SimpleFormValues>;
  index: number;
}

// Поля составляющей «Скорость»: один список изменений, под ним поля выбранного. Число
// всегда положительное: «меньше на» — отдельный пункт, вводить минус не нужно (на
// телефоне его часто нет на клавиатуре). Решено с пользователем 2026-10-16.
function SpeedComponentFields({ form, index }: SpeedComponentFieldsProps) {
  const path = `effect.components.${index}.speed`;
  const { change, sameAsSpeed } =
    form.getValues().effect.components[index].speed;
  const special = isSpecialSpeed(change);
  const feetInput = (
    <NumberInput
      label={special ? 'Сколько футов' : 'На сколько футов'}
      // Звёздочка без required: иначе браузер сам проверит поле раньше формы.
      withAsterisk
      min={SPEED_FEET_STEP}
      max={SPEED_FEET_MAX}
      step={SPEED_FEET_STEP}
      allowDecimal={false}
      allowNegative={false}
      w={140}
      {...form.getInputProps(`${path}.feet`)}
    />
  );

  return (
    <Stack gap="xs">
      <Select
        label="Что меняется"
        description="Изменение обычной Скорости меняет так же и особые скорости носителя"
        data={CHANGE_OPTIONS}
        allowDeselect={false}
        maw={260}
        {...form.getInputProps(`${path}.change`)}
      />
      {speedNeedsFeet(change) && feetInput}
      {special && (
        <>
          <SegmentedControl
            aria-label="Сколько"
            data={AMOUNT_OPTIONS}
            size="xs"
            w="fit-content"
            maw="100%"
            value={sameAsSpeed ? 'same' : 'feet'}
            onChange={(value) =>
              form.setFieldValue(`${path}.sameAsSpeed`, value === 'same')
            }
          />
          {!sameAsSpeed && feetInput}
        </>
      )}
      {change === 'fly' && (
        <Checkbox
          label="Может парить"
          description="Как у Fly"
          {...form.getInputProps(`${path}.hover`, { type: 'checkbox' })}
        />
      )}
    </Stack>
  );
}

export default SpeedComponentFields;
