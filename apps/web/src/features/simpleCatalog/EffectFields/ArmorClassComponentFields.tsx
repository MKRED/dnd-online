import { NumberInput, Select, Stack } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import {
  ARMOR_CLASS_CHANGE_LABELS,
  ARMOR_CLASS_CHANGES,
  ARMOR_CLASS_LIMITS,
  type ArmorClassChange,
} from 'shared';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';

const CHANGE_OPTIONS = ARMOR_CLASS_CHANGES.map((value) => ({
  value,
  label: ARMOR_CLASS_CHANGE_LABELS[value],
}));

// Подсказка под выбором: как изменение считается на листе (docs/dnd/combining-effects.md).
const CHANGE_HINTS: Record<ArmorClassChange, string> = {
  bonus: 'Как у Shield of Faith: +2',
  penalty: 'Как у Slow: −2',
  minimum: 'Как у Barkskin: КД 17, если он ниже. Проверяется после бонусов',
  base: 'Как у Mage Armor: 13 + Ловкость. Действует, если больше КД без эффектов',
};

const VALUE_LABELS: Record<ArmorClassChange, string> = {
  bonus: 'На сколько',
  penalty: 'На сколько',
  minimum: 'КД не ниже',
  base: 'Число',
};

interface ArmorClassComponentFieldsProps {
  form: UseFormReturnType<SimpleFormValues>;
  index: number;
}

// Поля составляющей «Класс доспеха»: список изменений и число. Число всегда
// положительное: «меньше на» — отдельный пункт, как у Скорости (на телефоне минуса
// часто нет на клавиатуре).
function ArmorClassComponentFields({
  form,
  index,
}: ArmorClassComponentFieldsProps) {
  const path = `effect.components.${index}.armorClass`;
  const { change } = form.getValues().effect.components[index].armorClass;
  const { min, max } = ARMOR_CLASS_LIMITS[change];

  return (
    <Stack gap="xs">
      <Select
        label="Что меняется"
        description={CHANGE_HINTS[change]}
        data={CHANGE_OPTIONS}
        allowDeselect={false}
        maw={300}
        {...form.getInputProps(`${path}.change`)}
      />
      <NumberInput
        label={VALUE_LABELS[change]}
        // Звёздочка без required: иначе браузер сам проверит поле раньше формы.
        withAsterisk
        min={min}
        max={max}
        allowDecimal={false}
        allowNegative={false}
        w={140}
        {...form.getInputProps(`${path}.value`)}
      />
    </Stack>
  );
}

export default ArmorClassComponentFields;
