import {
  Fieldset,
  Grid,
  NumberInput,
  Select,
  Text,
  TextInput,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { memo, useCallback, useState } from 'react';
import {
  HEROIC_INSPIRATION_MAX,
  HIT_DICE,
  PROFICIENCY_BONUS_MAX,
  PROFICIENCY_BONUS_MIN,
  TURN_ACTIONS_MAX,
  TURN_ACTIONS_MIN,
} from 'shared';
import type { CharacterFormValues } from '../characterFormValues';
import {
  formatModifier,
  getAbilityModifier,
} from './AbilityScoresSection/abilityMath';
import { formErrorsEqual } from '../../../components/form';

const HIT_DIE_OPTIONS = HIT_DICE.map((die) => ({
  value: String(die),
  label: `к${die}`,
}));

// Действия за ход (docs/dnd/ability-usage.md, «Действия за ход»).
const TURN_ACTIONS = [
  { key: 'actionCount', label: 'Действия' },
  { key: 'bonusActionCount', label: 'Бонусные действия' },
  { key: 'reactionCount', label: 'Реакции' },
] as const;

interface CombatSectionProps {
  form: UseFormReturnType<CharacterFormValues>;
  wornArmor: string | null;
}

// КД лист считает от надетого (docs/plan/equipment.md, этап 3, вариант А): число формы —
// КД без доспеха, щит лист прибавит сам.
const armorClassHint = (wornArmor: string | null) =>
  wornArmor
    ? `Сейчас не считается: надет доспех «${wornArmor}»`
    : '10 + Ловкость или своя защита без доспеха. Доспех и щит лист прибавит сам';

function CombatSection({ form, wornArmor }: CombatSectionProps) {
  // Инициатива не хранится: по правилам 2024 это модификатор Ловкости. Секция
  // мемоизирована, поэтому за Ловкостью следим сами.
  const [dexterity, setDexterity] = useState(
    () => form.getValues().abilityScores.dexterity,
  );
  form.watch(
    'abilityScores.dexterity',
    // См. аналогичный комментарий в AbilityCard про '' во время редактирования NumberInput.
    useCallback(({ value }: { value: number | string }) => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        setDexterity(value);
      }
    }, []),
  );

  return (
    <Fieldset legend="Боевые параметры">
      <Grid align="flex-end">
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <NumberInput
            label="Бонус мастерства"
            min={PROFICIENCY_BONUS_MIN}
            max={PROFICIENCY_BONUS_MAX}
            {...form.getInputProps('proficiencyBonus')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <NumberInput
            label="КД без доспеха"
            description={armorClassHint(wornArmor)}
            min={0}
            {...form.getInputProps('armorClass')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <TextInput
            label="Инициатива"
            value={formatModifier(getAbilityModifier(dexterity))}
            readOnly
            variant="filled"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <NumberInput
            label="Скорость без эффектов, фут"
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
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <Select
            label="Кость хитов"
            placeholder="Выберите кость"
            data={HIT_DIE_OPTIONS}
            allowDeselect={false}
            required
            {...form.getInputProps('hitDie')}
          />
        </Grid.Col>
        <Grid.Col span={12}>
          <Text size="xs" c="dimmed">
            Инициатива считается автоматически: это модификатор Ловкости.
          </Text>
        </Grid.Col>
        {TURN_ACTIONS.map(({ key, label }) => (
          <Grid.Col key={key} span={{ base: 4, sm: 3 }}>
            <NumberInput
              label={label}
              min={TURN_ACTIONS_MIN}
              max={TURN_ACTIONS_MAX}
              allowDecimal={false}
              allowNegative={false}
              {...form.getInputProps(key)}
            />
          </Grid.Col>
        ))}
        <Grid.Col span={12}>
          <Text size="xs" c="dimmed">
            Действия, бонусные действия и реакции за ход: обычно по 1. Ускорение
            и Всплеск действий прибавят своё сами, когда появится бой.
          </Text>
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <NumberInput
            label="Героическое вдохновение"
            description="Тратится на переброс любой кости"
            min={0}
            max={HEROIC_INSPIRATION_MAX}
            allowDecimal={false}
            allowNegative={false}
            {...form.getInputProps('heroicInspiration')}
          />
        </Grid.Col>
      </Grid>
    </Fieldset>
  );
}

export default memo(CombatSection, formErrorsEqual);
