import { Checkbox, Fieldset, Grid, NumberInput } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { memo } from 'react';
import type { CharacterFormValues } from '../../features/characters';
import { formErrorsEqual } from './formSectionMemo';

interface CombatSectionProps {
  form: UseFormReturnType<CharacterFormValues>;
}

function CombatSection({ form }: CombatSectionProps) {
  return (
    <Fieldset legend="Боевые параметры">
      <Grid align="flex-end">
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <NumberInput
            label="Бонус мастерства"
            min={2}
            max={6}
            {...form.getInputProps('proficiencyBonus')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <NumberInput
            label="Класс доспеха"
            min={0}
            {...form.getInputProps('armorClass')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <NumberInput
            label="Скорость (фут)"
            min={0}
            {...form.getInputProps('speed')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <NumberInput
            label="ХП (максимум)"
            min={1}
            {...form.getInputProps('hitPointsMax')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <NumberInput
            label="ХП (текущие)"
            min={0}
            {...form.getInputProps('hitPointsCurrent')}
          />
        </Grid.Col>
        <Grid.Col span={12}>
          <Checkbox
            label="Героическое вдохновение"
            {...form.getInputProps('heroicInspiration', { type: 'checkbox' })}
          />
        </Grid.Col>
      </Grid>
    </Fieldset>
  );
}

export default memo(CombatSection, formErrorsEqual);
