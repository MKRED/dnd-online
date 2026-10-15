import {
  Checkbox,
  Group,
  Input,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Text,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import {
  DURATION_AMOUNT_MAX,
  DURATION_UNITS,
  durationUnitLabel,
  formatEffectDuration,
  type EffectDurationKind,
} from 'shared';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';
import { fromDurationValues, validateDurationAmount } from './durationForm';

const KIND_OPTIONS: { value: EffectDurationKind; label: string }[] = [
  { value: 'permanent', label: 'Бессрочно' },
  { value: 'time', label: 'Время' },
  { value: 'turn', label: 'До следующего хода' },
  { value: 'rest', label: 'До отдыха' },
];

// Подсказка под видом: что он значит в игре.
const KIND_HINTS: Record<EffectDurationKind, string> = {
  permanent:
    'Пока не снимут. Так заводят и постоянные черты: тёмное зрение эльфа, сопротивление яду',
  time: 'Раунд — около 6 секунд, в минуте 10 раундов',
  turn: 'Как «Безрассудная атака» или «Луч холода»: спадает на границе хода',
  rest: 'Спадает, когда носитель закончит отдых',
};

interface DurationFieldProps {
  form: UseFormReturnType<SimpleFormValues>;
}

// Длительность эффекта: вид и поля этого вида (docs/plan/effects.md). Под полями — как
// длительность прочитается на карточке.
function DurationField({ form }: DurationFieldProps) {
  const values = form.getValues().duration;
  const amount = Number(values.amount) || 1;

  return (
    <Stack gap="xs">
      <Select
        label="Длительность"
        description={KIND_HINTS[values.kind]}
        data={KIND_OPTIONS}
        allowDeselect={false}
        maw={320}
        {...form.getInputProps('duration.kind')}
      />
      {values.kind === 'time' && (
        <>
          <Group gap="xs" align="flex-start" wrap="nowrap">
            <NumberInput
              aria-label="Сколько"
              min={1}
              max={DURATION_AMOUNT_MAX}
              allowDecimal={false}
              allowNegative={false}
              w={96}
              {...form.getInputProps('duration.amount')}
            />
            <Select
              aria-label="Единица времени"
              data={DURATION_UNITS.map((unit) => ({
                value: unit,
                label: durationUnitLabel(unit, amount),
              }))}
              allowDeselect={false}
              w={140}
              {...form.getInputProps('duration.unit')}
            />
          </Group>
          <Checkbox
            label="Концентрация"
            description="Эффект спадёт раньше, если наложивший потеряет концентрацию"
            {...form.getInputProps('duration.concentration', {
              type: 'checkbox',
            })}
          />
        </>
      )}
      {values.kind === 'turn' && (
        <Group gap="md" align="flex-start">
          <Input.Wrapper label="Спадает">
            <SegmentedControl
              display="flex"
              data={[
                { value: 'start', label: 'В начале' },
                { value: 'end', label: 'В конце' },
              ]}
              {...form.getInputProps('duration.edge')}
            />
          </Input.Wrapper>
          <Input.Wrapper label="Чьего хода">
            <SegmentedControl
              display="flex"
              data={[
                { value: 'creator', label: 'Наложившего' },
                { value: 'bearer', label: 'Своего' },
              ]}
              {...form.getInputProps('duration.owner')}
            />
          </Input.Wrapper>
        </Group>
      )}
      {values.kind === 'rest' && (
        <Input.Wrapper label="Какого отдыха">
          <SegmentedControl
            display="flex"
            maw={360}
            data={[
              { value: 'short', label: 'Короткого или долгого' },
              { value: 'long', label: 'Только долгого' },
            ]}
            {...form.getInputProps('duration.rest')}
          />
        </Input.Wrapper>
      )}
      {/* Пока число неверное, читать нечего: «0 минут» только запутает. */}
      {values.kind !== 'permanent' &&
        !validateDurationAmount(values.amount, { duration: values }) && (
          <Text size="sm" c="dimmed">
            На карточке: «{formatEffectDuration(fromDurationValues(values))}»
          </Text>
        )}
    </Stack>
  );
}

export default DurationField;
