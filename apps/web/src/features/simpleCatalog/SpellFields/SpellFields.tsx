import { Checkbox, Group, Select, Stack, TextInput } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import {
  SPELL_DURATION_KINDS,
  SPELL_DURATION_LABELS,
  SPELL_LEVEL_MAX,
  SPELL_SCHOOL_LABELS,
  SPELL_SCHOOLS,
  formatSpellLevel,
} from 'shared';
import { TimeFields } from '../DurationField';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';
import { suggestSpellSlot } from './spellSlot';

const LEVEL_OPTIONS = Array.from(
  { length: SPELL_LEVEL_MAX + 1 },
  (_, level) => ({
    value: String(level),
    label: formatSpellLevel(level),
  }),
);

const SCHOOL_OPTIONS = SPELL_SCHOOLS.map((value) => ({
  value,
  label: SPELL_SCHOOL_LABELS[value],
}));

const DURATION_OPTIONS = SPELL_DURATION_KINDS.map((value) => ({
  value,
  label: SPELL_DURATION_LABELS[value],
}));

interface SpellFieldsProps {
  form: UseFormReturnType<SimpleFormValues>;
}

// Поля «Заклинания» — сразу под категорией, в порядке строки книги: круг и школа,
// ритуал, компоненты, длительность. Время накладывания — общая «Активация» ниже.
function SpellFields({ form }: SpellFieldsProps) {
  const spell = form.getValues().spell;
  const levelProps = form.getInputProps('spell.level');

  return (
    <Stack gap="xs">
      <Group gap="xs" align="flex-start">
        <Select
          label="Круг"
          data={LEVEL_OPTIONS}
          allowDeselect={false}
          w={140}
          {...levelProps}
          // Круг подставляет затрату «Ячейка заклинаний» (spellSlot.ts).
          onChange={(value: string | null) => {
            if (value === null) return;
            const previous = Number(form.getValues().spell.level);
            form.setFieldValue('spell.level', value);
            suggestSpellSlot(form, Number(value), previous);
          }}
        />
        <Select
          label="Школа"
          placeholder="Выберите"
          required
          data={SCHOOL_OPTIONS}
          allowDeselect={false}
          w={190}
          {...form.getInputProps('spell.school')}
        />
      </Group>
      {/* У заговора ячейки нет — ритуалу нечего беречь. */}
      {spell.level !== '0' && (
        <Checkbox
          label="Ритуал"
          description="Можно сотворить на 10 минут дольше, не тратя ячейку"
          {...form.getInputProps('spell.ritual', { type: 'checkbox' })}
        />
      )}
      <TextInput
        label="Компоненты"
        placeholder="В, С, М (шарик из помёта летучей мыши и серы)"
        {...form.getInputProps('spell.components')}
      />
      <Select
        label="Длительность"
        data={DURATION_OPTIONS}
        allowDeselect={false}
        maw={320}
        {...form.getInputProps('spell.duration.kind')}
      />
      {spell.duration.kind === 'time' && (
        <TimeFields
          form={form}
          path="spell.duration"
          value={spell.duration}
          concentrationHint="Держит сотворивший. Новое заклинание с концентрацией обрывает прошлое"
        />
      )}
    </Stack>
  );
}

export default SpellFields;
