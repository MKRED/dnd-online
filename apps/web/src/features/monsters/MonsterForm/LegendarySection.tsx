import { Fieldset, Grid, NumberInput, Select, Text } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { memo } from 'react';
import {
  ABILITY_SCORES,
  MONSTER_LEGENDARY_ACTIONS_MAX,
  MONSTER_SAVE_DC_MAX,
} from 'shared';
import { formErrorsEqual } from '../../../components/form';
import { ABILITY_LABELS } from '../../characters';
import type { MonsterFormValues } from './monsterFormValues';

const ABILITY_OPTIONS = ABILITY_SCORES.map((value) => ({
  value,
  label: ABILITY_LABELS[value],
}));

// Необязательные числа: легендарные действия (запас на раунд) и колдовство. Сами
// легендарные действия и заклинания — способности монстра (этап 5 плана).
function LegendarySection({
  form,
}: {
  form: UseFormReturnType<MonsterFormValues>;
}) {
  const legendary = {
    min: 1,
    max: MONSTER_LEGENDARY_ACTIONS_MAX,
    allowDecimal: false,
    placeholder: 'Нет',
  };
  return (
    <Fieldset legend="Легендарные действия и колдовство">
      <Grid align="flex-start">
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <NumberInput
            label="Легендарные действия"
            description="Сколько за раунд"
            {...legendary}
            {...form.getInputProps('legendaryActions')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <NumberInput
            label="В логове"
            description="Если в логове больше"
            {...legendary}
            {...form.getInputProps('legendaryActionsLair')}
          />
        </Grid.Col>
        <Grid.Col span={12}>
          <Text size="sm" fw={500}>
            Колдовство — заполните, если монстр колдует
          </Text>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <Select
            label="Характеристика"
            placeholder="Нет"
            data={ABILITY_OPTIONS}
            clearable
            {...form.getInputProps('spellcasting.ability')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 4 }}>
          <NumberInput
            label="СЛ спасброска"
            placeholder="Нет"
            min={1}
            max={MONSTER_SAVE_DC_MAX}
            allowDecimal={false}
            {...form.getInputProps('spellcasting.saveDc')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 4 }}>
          <NumberInput
            label="Бонус атаки"
            placeholder="Нет"
            allowDecimal={false}
            {...form.getInputProps('spellcasting.attackBonus')}
          />
        </Grid.Col>
      </Grid>
    </Fieldset>
  );
}

export default memo(LegendarySection, formErrorsEqual);
