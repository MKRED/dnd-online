import { Fieldset, Grid, TagsInput } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { memo } from 'react';
import type { CharacterFormValues } from '../characterFormValues';
import { formErrorsEqual } from './formSectionMemo';

interface ProficienciesSectionProps {
  form: UseFormReturnType<CharacterFormValues>;
}

function ProficienciesSection({ form }: ProficienciesSectionProps) {
  return (
    <Fieldset legend="Владения и снаряжение">
      <Grid>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <TagsInput
            label="Доспехи"
            placeholder="Enter — добавить"
            {...form.getInputProps('armorProficiencies')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <TagsInput
            label="Оружие"
            placeholder="Enter — добавить"
            {...form.getInputProps('weaponProficiencies')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <TagsInput
            label="Инструменты"
            placeholder="Enter — добавить"
            {...form.getInputProps('toolProficiencies')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <TagsInput
            label="Языки"
            placeholder="Enter — добавить"
            {...form.getInputProps('languages')}
          />
        </Grid.Col>
        <Grid.Col span={12}>
          <TagsInput
            label="Мастерство оружия"
            description="Новая механика редакции 2024"
            placeholder="Enter — добавить"
            {...form.getInputProps('weaponMasteries')}
          />
        </Grid.Col>
      </Grid>
    </Fieldset>
  );
}

export default memo(ProficienciesSection, formErrorsEqual);
