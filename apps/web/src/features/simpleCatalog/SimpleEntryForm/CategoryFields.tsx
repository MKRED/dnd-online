import { NumberInput, Select, Stack } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import {
  SENSE_KINDS,
  SENSE_LABELS,
  SENSE_RANGE_MAX,
  SENSE_RANGE_STEP,
  senseHasRange,
  type SenseKind,
} from 'shared';
import type { SimpleFormValues } from './simpleEntryValues';

const SENSE_OPTIONS = SENSE_KINDS.map((value) => ({
  value,
  label: SENSE_LABELS[value],
}));

// Что чувство даёт по книге (docs/dnd/senses.md) — подсказка под выбором.
const SENSE_HINTS: Record<SenseKind, string> = {
  darkvision:
    'Тусклый свет видит как яркий, темноту — как тусклый свет, без цветов',
  blindsight: 'Видит без глаз: ослеплённым, в темноте, невидимых',
  tremorsense: 'Чует существ и движущиеся предметы на той же поверхности',
  truesight: 'Видит сквозь тьму, невидимость, иллюзии и превращения',
  devils_sight:
    'Видит в тусклом свете и темноте, в том числе магической, как при обычном свете',
  see_invisible: 'Видит невидимых и Эфирный план везде, куда смотрит',
};

interface CategoryFieldsProps {
  form: UseFormReturnType<SimpleFormValues>;
}

// Свои поля категории (details). У категорий без своих полей — ничего.
function CategoryFields({ form }: CategoryFieldsProps) {
  const { category, sense } = form.getValues();
  if (category !== 'sense') return null;

  return (
    <Stack gap="sm">
      <Select
        label="Вид чувства"
        description={sense ? SENSE_HINTS[sense] : undefined}
        placeholder="Выберите вид"
        required
        data={SENSE_OPTIONS}
        allowDeselect={false}
        maw={320}
        {...form.getInputProps('sense')}
      />
      {sense && senseHasRange(sense) && (
        <NumberInput
          label="Дистанция"
          description={`Кратно ${SENSE_RANGE_STEP}`}
          required
          min={SENSE_RANGE_STEP}
          max={SENSE_RANGE_MAX}
          step={SENSE_RANGE_STEP}
          allowDecimal={false}
          allowNegative={false}
          rightSection="фт."
          rightSectionWidth={36}
          w={140}
          {...form.getInputProps('senseRange')}
        />
      )}
    </Stack>
  );
}

export default CategoryFields;
