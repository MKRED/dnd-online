import {
  ActionIcon,
  Button,
  Fieldset,
  Grid,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { memo, useState } from 'react';
import {
  MONSTER_LANGUAGES_MAX_LENGTH,
  SENSE_KINDS,
  SENSE_LABELS,
  SENSE_RANGE_STEP,
  senseHasRange,
  type SenseKind,
} from 'shared';
import { formErrorsEqual } from '../../../components/form';
import type { MonsterFormValues } from './monsterFormValues';
import { useRowIds } from './useRowIds';

const SENSE_OPTIONS = SENSE_KINDS.map((value) => ({
  value,
  label: SENSE_LABELS[value],
}));

interface SenseRowProps {
  form: UseFormReturnType<MonsterFormValues>;
  index: number;
}

function SenseRow({ form, index }: SenseRowProps) {
  const path = `senses.${index}`;
  // У «Видения невидимого» дистанции нет — поле блокируется по выбранному чувству.
  const [sense, setSense] = useState(
    () => form.getValues().senses[index].sense,
  );
  const withRange = sense === '' || senseHasRange(sense);

  return (
    <Grid align="flex-start">
      <Grid.Col span={{ base: 12, xs: 6 }}>
        <Select
          label="Чувство"
          placeholder="Выберите чувство"
          data={SENSE_OPTIONS}
          allowDeselect={false}
          {...form.getInputProps(`${path}.sense`)}
          onChange={(value) => {
            form.setFieldValue(`${path}.sense`, (value ?? '') as SenseKind);
            setSense((value ?? '') as SenseKind);
          }}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 8, xs: 4 }}>
        <NumberInput
          label="Дистанция, фт"
          placeholder={withRange ? undefined : 'Без дистанции'}
          disabled={!withRange}
          min={SENSE_RANGE_STEP}
          step={SENSE_RANGE_STEP}
          allowDecimal={false}
          {...form.getInputProps(`${path}.range`)}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 4, xs: 2 }} pt={34}>
        <ActionIcon
          color="red"
          variant="subtle"
          onClick={() => form.removeListItem('senses', index)}
          aria-label="Убрать чувство"
        >
          ✕
        </ActionIcon>
      </Grid.Col>
    </Grid>
  );
}

interface SensesSectionProps {
  form: UseFormReturnType<MonsterFormValues>;
}

function SensesSection({ form }: SensesSectionProps) {
  const ids = useRowIds(form, 'senses');
  return (
    <Fieldset legend="Чувства и языки">
      <Stack gap="xs">
        {ids.length === 0 && (
          <Text size="sm" c="dimmed">
            Особых чувств нет.
          </Text>
        )}
        {ids.map((id, index) => (
          <SenseRow key={id} form={form} index={index} />
        ))}
        <Button
          variant="light"
          size="xs"
          style={{ alignSelf: 'flex-start' }}
          onClick={() =>
            form.insertListItem('senses', {
              id: crypto.randomUUID(),
              sense: '',
              range: 60,
            })
          }
        >
          Добавить чувство
        </Button>
        <Grid mt="xs">
          <Grid.Col span={{ base: 12, xs: 4 }}>
            <NumberInput
              label="Пассивное Восприятие"
              min={0}
              allowDecimal={false}
              {...form.getInputProps('passivePerception')}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, xs: 8 }}>
            <TextInput
              label="Языки"
              placeholder="Например, Глубинная речь, телепатия 120 фт."
              maxLength={MONSTER_LANGUAGES_MAX_LENGTH}
              {...form.getInputProps('languages')}
            />
          </Grid.Col>
        </Grid>
      </Stack>
    </Fieldset>
  );
}

export default memo(SensesSection, formErrorsEqual);
