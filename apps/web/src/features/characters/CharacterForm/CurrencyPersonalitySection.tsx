import { Fieldset, Grid, NumberInput, Stack, Textarea } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { memo } from 'react';
import type { CharacterFormValues } from '../characterFormValues';
import { formErrorsEqual } from './formSectionMemo';

interface CurrencyPersonalitySectionProps {
  form: UseFormReturnType<CharacterFormValues>;
}

const CURRENCIES: { key: 'cp' | 'sp' | 'ep' | 'gp' | 'pp'; label: string }[] = [
  { key: 'cp', label: 'Медь' },
  { key: 'sp', label: 'Серебро' },
  { key: 'ep', label: 'Электрум' },
  { key: 'gp', label: 'Золото' },
  { key: 'pp', label: 'Платина' },
];

const PERSONALITY_FIELDS: {
  key: 'traits' | 'ideals' | 'bonds' | 'flaws' | 'backstory' | 'appearance';
  label: string;
}[] = [
  { key: 'traits', label: 'Черты характера' },
  { key: 'ideals', label: 'Идеалы' },
  { key: 'bonds', label: 'Привязанности' },
  { key: 'flaws', label: 'Слабости' },
  { key: 'appearance', label: 'Внешность' },
  { key: 'backstory', label: 'Предыстория' },
];

function CurrencyPersonalitySection({ form }: CurrencyPersonalitySectionProps) {
  return (
    <>
      <Fieldset legend="Деньги">
        <Grid>
          {CURRENCIES.map(({ key, label }) => (
            <Grid.Col key={key} span={{ base: 6, sm: 2.4 }}>
              <NumberInput
                label={label}
                min={0}
                {...form.getInputProps(`currency.${key}`)}
              />
            </Grid.Col>
          ))}
        </Grid>
      </Fieldset>

      <Fieldset legend="Личность" mt="md">
        <Stack>
          {PERSONALITY_FIELDS.map(({ key, label }) => (
            <Textarea
              key={key}
              label={label}
              autosize
              minRows={2}
              {...form.getInputProps(`personality.${key}`)}
            />
          ))}
        </Stack>
      </Fieldset>
    </>
  );
}

export default memo(CurrencyPersonalitySection, formErrorsEqual);
