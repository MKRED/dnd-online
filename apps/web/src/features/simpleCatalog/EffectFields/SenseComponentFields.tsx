import { Group, NumberInput, Select } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import {
  SENSE_KINDS,
  SENSE_LABELS,
  SENSE_RANGE_MAX,
  SENSE_RANGE_STEP,
  senseHasRange,
  type SenseKind,
} from 'shared';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';

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

interface SenseComponentFieldsProps {
  form: UseFormReturnType<SimpleFormValues>;
  index: number;
}

// Поля составляющей «Чувство»: вид и дистанция в футах.
function SenseComponentFields({ form, index }: SenseComponentFieldsProps) {
  const path = `effect.components.${index}`;
  const { sense } = form.getValues().effect.components[index];

  return (
    <Group gap="xs" align="flex-start">
      <Select
        label="Вид чувства"
        description={sense ? SENSE_HINTS[sense] : undefined}
        placeholder="Выберите вид"
        required
        data={SENSE_OPTIONS}
        allowDeselect={false}
        w={260}
        {...form.getInputProps(`${path}.sense`)}
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
          {...form.getInputProps(`${path}.range`)}
        />
      )}
    </Group>
  );
}

export default SenseComponentFields;
