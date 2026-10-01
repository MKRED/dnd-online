import {
  Fieldset,
  Grid,
  NumberInput,
  Select,
  Stack,
  TextInput,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { memo } from 'react';
import type { CharacterFormValues } from '../../characterFormValues';
import { formErrorsEqual } from '../formSectionMemo';
import ClassesList from './ClassesList';

const ALIGNMENTS = [
  'Законно-добрый',
  'Нейтрально-добрый',
  'Хаотично-добрый',
  'Законно-нейтральный',
  'Нейтральный',
  'Хаотично-нейтральный',
  'Законно-злой',
  'Нейтрально-злой',
  'Хаотично-злой',
];

interface IdentitySectionProps {
  form: UseFormReturnType<CharacterFormValues>;
}

function IdentitySection({ form }: IdentitySectionProps) {
  return (
    <Fieldset legend="Основное">
      <Stack>
        <Grid>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <TextInput
              label="Имя"
              placeholder="Имя персонажа"
              required
              {...form.getInputProps('name')}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <TextInput
              label="Вид"
              placeholder="Например, эльф"
              required
              {...form.getInputProps('species')}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <TextInput
              label="Предыстория"
              placeholder="Например, солдат"
              required
              {...form.getInputProps('background')}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Select
              label="Мировоззрение"
              placeholder="Не выбрано"
              clearable
              data={ALIGNMENTS}
              {...form.getInputProps('alignment')}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <NumberInput
              label="Опыт"
              min={0}
              {...form.getInputProps('experiencePoints')}
            />
          </Grid.Col>
        </Grid>

        <ClassesList form={form} />
      </Stack>
    </Fieldset>
  );
}

export default memo(IdentitySection, formErrorsEqual);
