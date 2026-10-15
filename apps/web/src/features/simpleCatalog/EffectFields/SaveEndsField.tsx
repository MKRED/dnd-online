import {
  Checkbox,
  Group,
  SegmentedControl,
  Select,
  Stack,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { ABILITY_SCORES } from 'shared';
import { ABILITY_LABELS } from '../../characters';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';

const ABILITY_OPTIONS = ABILITY_SCORES.map((value) => ({
  value,
  label: ABILITY_LABELS[value],
}));

const EDGE_OPTIONS = [
  { value: 'start', label: 'В начале хода' },
  { value: 'end', label: 'В конце хода' },
];

interface SaveEndsFieldProps {
  form: UseFormReturnType<SimpleFormValues>;
}

// «Снимается спасброском»: носитель повторяет спасбросок каждый свой ход, успех снимает
// эффект. Сл здесь нет — её даёт то, что наложило эффект (docs/plan/effects.md).
function SaveEndsField({ form }: SaveEndsFieldProps) {
  const { on } = form.getValues().effect.saveEnds;

  return (
    <Stack gap="xs">
      <Checkbox
        label="Снимается спасброском"
        description="Носитель повторяет спасбросок каждый свой ход, успех снимает эффект. Сложность задаёт то, что наложило эффект"
        {...form.getInputProps('effect.saveEnds.on', { type: 'checkbox' })}
      />
      {on && (
        <Group gap="xs" align="flex-start" pl="xl">
          <Select
            aria-label="Характеристика спасброска"
            placeholder="Характеристика"
            data={ABILITY_OPTIONS}
            allowDeselect={false}
            w={200}
            {...form.getInputProps('effect.saveEnds.ability')}
          />
          <SegmentedControl
            aria-label="Когда носитель делает спасбросок"
            data={EDGE_OPTIONS}
            {...form.getInputProps('effect.saveEnds.edge')}
          />
        </Group>
      )}
    </Stack>
  );
}

export default SaveEndsField;
