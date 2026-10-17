import {
  Checkbox,
  Group,
  Input,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import {
  ABILITY_SCORES,
  ATTACK_BONUS_MAX,
  ATTACK_BONUS_MIN,
  ATTACK_KIND_LABELS,
  ATTACK_KINDS,
  FEET_STEP,
  RANGE_FEET_MAX,
  REACH_FEET_MAX,
  STEP_TARGET_LABELS,
  attackTargets,
  type AttackKind,
} from 'shared';
import { ABILITY_LABELS } from '../../characters';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';
import { withAttack } from './stepsForm';

const ATTACK_OPTIONS = ATTACK_KINDS.map((value) => ({
  value,
  label: ATTACK_KIND_LABELS[value],
}));
const MELEE_TARGETS = attackTargets('melee_weapon').map((value) => ({
  value,
  label: STEP_TARGET_LABELS[value],
}));
const ABILITY_OPTIONS = [
  { value: 'spellcasting', label: 'Заклинательная характеристика' },
  { value: 'finesse', label: 'Сила или Ловкость (фехтовальное)' },
  ...ABILITY_SCORES.map((value) => ({ value, label: ABILITY_LABELS[value] })),
];
const BONUS_OPTIONS = [
  { value: 'ability', label: 'Характеристика + бонус мастерства' },
  { value: 'fixed', label: 'Числом' },
];

interface AttackFieldsProps {
  form: UseFormReturnType<SimpleFormValues>;
  index: number;
}

// Вид атаки, цель и бонус атаки одного шага.
function AttackFields({ form, index }: AttackFieldsProps) {
  const path = `steps.${index}`;
  const step = form.getValues().steps[index];
  const melee = step.target !== 'range';

  return (
    <Stack gap="xs">
      <Select
        label="Вид атаки"
        data={ATTACK_OPTIONS}
        allowDeselect={false}
        maw={320}
        value={step.attack}
        // Смена вида подставляет его цель и характеристику (withAttack).
        onChange={(attack) =>
          form.setFieldValue(path, withAttack(step, attack as AttackKind))
        }
      />
      {melee ? (
        <Input.Wrapper label="Цель">
          <Group gap="xs" align="center" wrap="wrap">
            <SegmentedControl
              aria-label="Цель"
              data={MELEE_TARGETS}
              size="xs"
              {...form.getInputProps(`${path}.target`)}
            />
            {step.target === 'reach' && (
              <NumberInput
                aria-label="Досягаемость, фт."
                suffix=" фт."
                min={FEET_STEP}
                max={REACH_FEET_MAX}
                step={FEET_STEP}
                allowDecimal={false}
                allowNegative={false}
                size="xs"
                w={90}
                {...form.getInputProps(`${path}.reachFeet`)}
              />
            )}
          </Group>
        </Input.Wrapper>
      ) : (
        <Group gap="xs" align="flex-start" wrap="wrap">
          <NumberInput
            label="Дистанция, фт."
            min={FEET_STEP}
            max={RANGE_FEET_MAX}
            step={FEET_STEP}
            allowDecimal={false}
            allowNegative={false}
            w={130}
            {...form.getInputProps(`${path}.rangeFeet`)}
          />
          {step.attack === 'ranged_weapon' && step.longOn && (
            <NumberInput
              label="Дальняя, фт."
              description="С помехой"
              min={FEET_STEP}
              max={RANGE_FEET_MAX}
              step={FEET_STEP}
              allowDecimal={false}
              allowNegative={false}
              w={130}
              {...form.getInputProps(`${path}.longFeet`)}
            />
          )}
        </Group>
      )}
      {step.attack === 'ranged_weapon' && (
        <Checkbox
          label="Есть дальняя дистанция, как у лука: 150/600"
          {...form.getInputProps(`${path}.longOn`, { type: 'checkbox' })}
        />
      )}
      <Input.Wrapper label="Бонус атаки">
        <Stack gap={4}>
          <SegmentedControl
            aria-label="Бонус атаки"
            data={BONUS_OPTIONS}
            size="xs"
            w="fit-content"
            maw="100%"
            {...form.getInputProps(`${path}.bonusKind`)}
          />
          {step.bonusKind === 'ability' ? (
            <Select
              aria-label="Характеристика атаки"
              data={ABILITY_OPTIONS}
              allowDeselect={false}
              maw={320}
              {...form.getInputProps(`${path}.bonusAbility`)}
            />
          ) : (
            <NumberInput
              aria-label="Бонус атаки числом"
              min={ATTACK_BONUS_MIN}
              max={ATTACK_BONUS_MAX}
              allowDecimal={false}
              w={100}
              {...form.getInputProps(`${path}.bonusValue`)}
            />
          )}
        </Stack>
      </Input.Wrapper>
    </Stack>
  );
}

export default AttackFields;
