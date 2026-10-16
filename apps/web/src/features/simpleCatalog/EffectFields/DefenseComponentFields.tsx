import { MultiSelect, SegmentedControl, Stack } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import {
  CONDITION_KINDS,
  CONDITION_LABELS,
  DAMAGE_TYPE_LABELS,
  DAMAGE_TYPES,
  DEFENSE_LEVEL_LABELS,
  DEFENSE_LEVELS,
} from 'shared';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';

const LEVEL_OPTIONS = DEFENSE_LEVELS.map((value) => ({
  value,
  label: DEFENSE_LEVEL_LABELS[value],
}));
const TYPE_OPTIONS = DAMAGE_TYPES.map((value) => ({
  value,
  label: DAMAGE_TYPE_LABELS[value],
}));
const CONDITION_OPTIONS = CONDITION_KINDS.map((value) => ({
  value,
  label: CONDITION_LABELS[value],
}));

interface DefenseComponentFieldsProps {
  form: UseFormReturnType<SimpleFormValues>;
  index: number;
}

// Поля составляющей «Сопротивление и иммунитет»: уровень и к чему. Несколько типов в
// одной карточке — как у Stoneskin (дробящий, колющий, рубящий). Звёздочка без required:
// иначе браузер сам проверит поле поиска раньше формы.
function DefenseComponentFields({ form, index }: DefenseComponentFieldsProps) {
  const path = `effect.components.${index}.defense`;
  const { level } = form.getValues().effect.components[index].defense;

  return (
    <Stack gap="xs">
      <SegmentedControl
        aria-label="Уровень защиты"
        data={LEVEL_OPTIONS}
        // Мелкий, как все переключатели в карточках составляющих: обычным размером три
        // уровня не влезают в карточку на телефоне, «Иммунитет» обрезается.
        size="xs"
        w="fit-content"
        maw="100%"
        {...form.getInputProps(`${path}.level`)}
      />
      <MultiSelect
        label="Типы урона"
        placeholder="Выберите типы"
        withAsterisk={level !== 'immunity'}
        data={TYPE_OPTIONS}
        searchable
        hidePickedOptions
        {...form.getInputProps(`${path}.damageTypes`)}
      />
      {level === 'immunity' && (
        <MultiSelect
          label="Состояния"
          description="Состояние на носителя не действует: например, его нельзя испугать"
          placeholder="Выберите состояния"
          data={CONDITION_OPTIONS}
          searchable
          hidePickedOptions
          {...form.getInputProps(`${path}.conditions`)}
        />
      )}
    </Stack>
  );
}

export default DefenseComponentFields;
