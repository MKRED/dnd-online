import {
  Input,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import {
  ABILITY_CHECK_KINDS,
  ABILITY_CHECK_LABELS,
  ABILITY_SCORES,
  ATTACK_BONUS_MAX,
  ATTACK_BONUS_MIN,
  ATTACK_KIND_LABELS,
  ATTACK_KINDS,
  SAVE_DC_MAX,
  SAVE_DC_MIN,
  type AttackKind,
} from 'shared';
import { ABILITY_LABELS } from '../../characters';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';
import { withAttack, withCheck } from './stepsForm';

const CHECK_OPTIONS = ABILITY_CHECK_KINDS.map((value) => ({
  value,
  label: ABILITY_CHECK_LABELS[value],
}));
const ATTACK_OPTIONS = ATTACK_KINDS.map((value) => ({
  value,
  label: ATTACK_KIND_LABELS[value],
}));
const SIX = ABILITY_SCORES.map((value) => ({
  value,
  label: ABILITY_LABELS[value],
}));
const SPELLCASTING = {
  value: 'spellcasting',
  label: 'Заклинательная характеристика',
};
const BONUS_ABILITIES = [
  SPELLCASTING,
  { value: 'finesse', label: 'Сила или Ловкость (фехтовальное)' },
  ...SIX,
];
const DC_ABILITIES = [SPELLCASTING, ...SIX];

interface CheckFieldsProps {
  form: UseFormReturnType<SimpleFormValues>;
  index: number;
}

// Проверка шага: бросок атаки (вид и бонус), спасбросок (характеристика и Сл) или
// никакой. Бонус и Сл — «характеристика + бонус мастерства» или числом.
function CheckFields({ form, index }: CheckFieldsProps) {
  const path = `steps.${index}`;
  const step = form.getValues().steps[index];
  const attack = step.check === 'attack';
  // Бонус атаки и Сл устроены одинаково: переключатель, характеристика или число.
  const number = attack
    ? {
        kind: 'bonusKind',
        ability: 'bonusAbility',
        value: 'bonusValue',
        label: 'Бонус атаки',
        abilities: BONUS_ABILITIES,
        min: ATTACK_BONUS_MIN,
        max: ATTACK_BONUS_MAX,
        prefix: '',
      }
    : {
        kind: 'dcKind',
        ability: 'dcAbility',
        value: 'dcValue',
        label: 'Сл',
        abilities: DC_ABILITIES,
        min: SAVE_DC_MIN,
        max: SAVE_DC_MAX,
        prefix: '8 + ',
      };
  const byAbility = (attack ? step.bonusKind : step.dcKind) === 'ability';

  return (
    <Stack gap="xs">
      <Input.Wrapper label="Проверка">
        <div>
          <SegmentedControl
            aria-label="Проверка"
            data={CHECK_OPTIONS}
            size="xs"
            mt={4}
            value={step.check}
            // Смена проверки подбирает подходящую цель (withCheck).
            onChange={(check) =>
              form.setFieldValue(path, withCheck(step, check))
            }
          />
        </div>
      </Input.Wrapper>
      {attack && (
        <Select
          label="Вид атаки"
          data={ATTACK_OPTIONS}
          allowDeselect={false}
          maw={320}
          value={step.attack}
          // Смена вида подставляет его цель и характеристику (withAttack).
          onChange={(value) =>
            form.setFieldValue(path, withAttack(step, value as AttackKind))
          }
        />
      )}
      {step.check === 'save' && (
        <Select
          label="Спасбросок"
          data={SIX}
          allowDeselect={false}
          maw={320}
          {...form.getInputProps(`${path}.saveAbility`)}
        />
      )}
      {step.check !== 'none' && (
        <Input.Wrapper label={number.label}>
          <Stack gap={4} mt={4}>
            <SegmentedControl
              aria-label={number.label}
              data={[
                {
                  value: 'ability',
                  label: `${number.prefix}Характеристика + бонус мастерства`,
                },
                { value: 'fixed', label: 'Числом' },
              ]}
              size="xs"
              w="fit-content"
              maw="100%"
              {...form.getInputProps(`${path}.${number.kind}`)}
            />
            {byAbility ? (
              <Select
                aria-label={`${number.label}: характеристика`}
                data={number.abilities}
                allowDeselect={false}
                maw={320}
                {...form.getInputProps(`${path}.${number.ability}`)}
              />
            ) : (
              <NumberInput
                aria-label={`${number.label} числом`}
                min={number.min}
                max={number.max}
                allowDecimal={false}
                allowNegative={number.min < 0}
                w={100}
                {...form.getInputProps(`${path}.${number.value}`)}
              />
            )}
          </Stack>
        </Input.Wrapper>
      )}
    </Stack>
  );
}

export default CheckFields;
