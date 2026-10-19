import {
  Checkbox,
  Fieldset,
  Grid,
  NumberInput,
  Select,
  Text,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { memo } from 'react';
import {
  MONSTER_HIT_DICE,
  MONSTER_SIZE_HIT_DIE,
  SPEED_FEET_STEP,
  type MonsterSize,
} from 'shared';
import { formErrorsEqual } from '../../../components/form';
import type { MonsterFormValues } from './monsterFormValues';
import { useWatched } from './useWatched';

const DIE_OPTIONS = MONSTER_HIT_DICE.map((die) => ({
  value: String(die),
  label: `к${die}`,
}));

const SPECIAL_SPEEDS = [
  ['burrow', 'Копание'],
  ['climb', 'Лазание'],
  ['fly', 'Полёт'],
  ['swim', 'Плавание'],
] as const;

interface CombatSectionProps {
  form: UseFormReturnType<MonsterFormValues>;
}

// КД, инициатива, хиты и скорости — готовыми числами из книги: приложение их не выводит.
function CombatSection({ form }: CombatSectionProps) {
  const size = useWatched<MonsterSize>(form, 'size', (values) => values.size);
  const fly = useWatched(form, 'speed.fly', (values) => values.speed.fly);
  const feet = { min: 0, step: SPEED_FEET_STEP, allowDecimal: false };

  return (
    <Fieldset legend="Боевые параметры">
      <Grid align="flex-end">
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <NumberInput
            label="Класс доспеха"
            min={1}
            allowDecimal={false}
            {...form.getInputProps('armorClass')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <NumberInput
            label="Инициатива"
            description="Модификатор, как в книге"
            allowDecimal={false}
            {...form.getInputProps('initiative')}
          />
        </Grid.Col>
        <Grid.Col span={12}>
          <Text size="sm" fw={500}>
            Хиты: среднее и формула, например 150 (20к10 + 40). Прибавка —
            модификатор Телосложения × число костей
          </Text>
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <NumberInput
            label="Среднее"
            min={1}
            allowDecimal={false}
            {...form.getInputProps('hitPoints.average')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <NumberInput
            label="Число костей"
            min={1}
            allowDecimal={false}
            {...form.getInputProps('hitPoints.count')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <Select
            label="Кость"
            description={`По размеру — к${MONSTER_SIZE_HIT_DIE[size]}`}
            data={DIE_OPTIONS}
            allowDeselect={false}
            {...form.getInputProps('hitPoints.die')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <NumberInput
            label="Прибавка"
            allowDecimal={false}
            {...form.getInputProps('hitPoints.bonus')}
          />
        </Grid.Col>
        <Grid.Col span={12}>
          <Text size="sm" fw={500}>
            Скорость, фт. Пустое поле — такой скорости нет
          </Text>
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 'auto' }}>
          <NumberInput
            label="Ходьба"
            {...feet}
            {...form.getInputProps('speed.walk')}
          />
        </Grid.Col>
        {SPECIAL_SPEEDS.map(([kind, label]) => (
          <Grid.Col key={kind} span={{ base: 6, sm: 'auto' }}>
            <NumberInput
              label={label}
              placeholder="Нет"
              {...feet}
              {...form.getInputProps(`speed.${kind}`)}
            />
          </Grid.Col>
        ))}
        <Grid.Col span={12}>
          <Checkbox
            label="Парит"
            description={fly === '' ? 'Только при скорости полёта' : undefined}
            disabled={fly === ''}
            {...form.getInputProps('speed.hover', { type: 'checkbox' })}
          />
        </Grid.Col>
      </Grid>
    </Fieldset>
  );
}

export default memo(CombatSection, formErrorsEqual);
