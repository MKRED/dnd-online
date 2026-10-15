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
  SPELL_SLOT_LEVEL_MAX,
  USES_AMOUNT_MAX,
  type UsesCount,
  type UsesRecovery,
} from 'shared';
import { ABILITY_LABELS } from '../../characters';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';

const COUNT_OPTIONS: { value: UsesCount['kind']; label: string }[] = [
  { value: 'fixed', label: 'Число' },
  { value: 'proficiency', label: 'Бонус мастерства' },
  { value: 'ability', label: 'Модификатор характеристики' },
];

const RECOVERY_OPTIONS: { value: UsesRecovery; label: string }[] = [
  { value: 'long', label: 'Все — после долгого отдыха' },
  { value: 'short', label: 'Все — после короткого или долгого' },
  { value: 'short_one', label: 'Один — после короткого, все — после долгого' },
];

const ABILITY_OPTIONS = ABILITY_SCORES.map((value) => ({
  value,
  label: ABILITY_LABELS[value],
}));

interface CostsFieldsProps {
  form: UseFormReturnType<SimpleFormValues>;
}

// Что тратит способность: галочка на каждый вид, отмеченная раскрывает свои поля. Ничего
// не отмечено — способность ничего не тратит.
function CostsFields({ form }: CostsFieldsProps) {
  const usage = form.getValues().usage;
  const nested = { pl: 'xl' } as const;

  return (
    <Input.Wrapper
      label="Затраты"
      description="Отметьте, что тратит способность. Общие запасы персонажа (очки сосредоточенности, очки чародейства) пока пишите в описании"
    >
      <Stack gap="xs" mt={6}>
        <Checkbox
          label="Заряды"
          {...form.getInputProps('usage.usesOn', { type: 'checkbox' })}
        />
        {usage.usesOn && (
          <Stack gap="xs" {...nested}>
            <Group gap="xs" align="flex-start">
              <Select
                aria-label="Сколько зарядов"
                data={COUNT_OPTIONS}
                allowDeselect={false}
                w={240}
                {...form.getInputProps('usage.usesCount')}
              />
              {usage.usesCount === 'fixed' && (
                <NumberInput
                  aria-label="Число зарядов"
                  min={1}
                  max={USES_AMOUNT_MAX}
                  allowDecimal={false}
                  allowNegative={false}
                  w={96}
                  {...form.getInputProps('usage.usesAmount')}
                />
              )}
              {usage.usesCount === 'ability' && (
                <Select
                  aria-label="Характеристика"
                  data={ABILITY_OPTIONS}
                  allowDeselect={false}
                  w={160}
                  {...form.getInputProps('usage.usesAbility')}
                />
              )}
            </Group>
            <Select
              label="Восстановление"
              data={RECOVERY_OPTIONS}
              allowDeselect={false}
              maw={360}
              {...form.getInputProps('usage.usesRecovery')}
            />
          </Stack>
        )}
        <Checkbox
          label="Ячейка заклинаний"
          {...form.getInputProps('usage.slotOn', { type: 'checkbox' })}
        />
        {usage.slotOn && (
          <NumberInput
            label="Круг не ниже"
            description="1 — любой круг"
            min={1}
            max={SPELL_SLOT_LEVEL_MAX}
            allowDecimal={false}
            allowNegative={false}
            w={160}
            {...nested}
            {...form.getInputProps('usage.slotLevel')}
          />
        )}
        <Checkbox
          label="Движение"
          {...form.getInputProps('usage.movementOn', { type: 'checkbox' })}
        />
        {usage.movementOn && (
          <SegmentedControl
            data={[
              { value: 'half', label: 'Половина скорости' },
              { value: 'all', label: 'Вся скорость' },
            ]}
            ml="xl"
            style={{ alignSelf: 'flex-start' }}
            {...form.getInputProps('usage.movement')}
          />
        )}
        <Checkbox
          label="Кость хитов"
          {...form.getInputProps('usage.hitDie', { type: 'checkbox' })}
        />
      </Stack>
    </Input.Wrapper>
  );
}

export default CostsFields;
