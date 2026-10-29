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
  allowedCostKinds,
  MOVEMENT_FEET_MAX,
  MOVEMENT_FEET_STEP,
  SPELL_SLOT_LEVEL_MAX,
  USES_AMOUNT_MAX,
  type AbilityCategory,
  type MovementCost,
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

const MOVEMENT_OPTIONS: { value: MovementCost['kind']; label: string }[] = [
  { value: 'half', label: 'Половина' },
  { value: 'all', label: 'Вся скорость' },
  { value: 'feet', label: 'Футы' },
];

const ABILITY_OPTIONS = ABILITY_SCORES.map((value) => ({
  value,
  label: ABILITY_LABELS[value],
}));

interface CostsFieldsProps {
  form: UseFormReturnType<SimpleFormValues>;
}

// Подсказка под заголовком: общие запасы — только у умений персонажа.
const DESCRIPTIONS: Partial<Record<AbilityCategory, string>> = {
  feature:
    'Отметьте, что тратит умение. Общие запасы персонажа (очки сосредоточенности, очки чародейства) пока пишите в описании',
};

// Что тратит способность: галочка на каждый вид, отмеченная раскрывает свои поля. Ничего
// не отмечено — способность ничего не тратит. Показаны только затраты, которые есть у
// категории и активации (shared/abilityCategoryRules.ts); у монстра заряды — его
// «Ограничение» (MonsterAbilityFields), здесь их нет.
function CostsFields({ form }: CostsFieldsProps) {
  const { usage, category, spell } = form.getValues();
  const kinds = allowedCostKinds(
    category as AbilityCategory,
    usage.kind,
  ).filter((kind) => category !== 'monster' || kind !== 'uses');
  // У заклинания круг ячейки — его круг, у заговора ячейки нет.
  const spellLevel = category === 'spell' ? Number(spell.level) : null;
  const nested = { pl: 'xl' } as const;
  if (kinds.length === 0) return null;

  return (
    <Input.Wrapper
      label="Затраты"
      description={
        DESCRIPTIONS[category as AbilityCategory] ??
        'Отметьте, что тратит способность'
      }
    >
      <Stack gap="xs" mt={6}>
        {kinds.includes('uses') && (
          <Checkbox
            label="Заряды"
            {...form.getInputProps('usage.usesOn', { type: 'checkbox' })}
          />
        )}
        {kinds.includes('uses') && usage.usesOn && (
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
        {!kinds.includes('spellSlot') ? null : spellLevel === null ? (
          <Checkbox
            label="Ячейка заклинаний"
            {...form.getInputProps('usage.slotOn', { type: 'checkbox' })}
          />
        ) : (
          spellLevel >= 1 && (
            <Checkbox
              label={`Ячейка заклинаний ${spellLevel} круга или выше`}
              description="Круг — заклинания. Снимите, если его сотворяют без ячейки: например, раз за долгий отдых от черты"
              {...form.getInputProps('usage.slotOn', { type: 'checkbox' })}
            />
          )
        )}
        {kinds.includes('spellSlot') && spellLevel === null && usage.slotOn && (
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
        {kinds.includes('movement') && (
          <Checkbox
            label="Движение"
            {...form.getInputProps('usage.movementOn', { type: 'checkbox' })}
          />
        )}
        {kinds.includes('movement') && usage.movementOn && (
          <Group gap="xs" align="flex-start" {...nested}>
            <SegmentedControl
              aria-label="Сколько движения"
              data={MOVEMENT_OPTIONS}
              {...form.getInputProps('usage.movement')}
            />
            {usage.movement === 'feet' && (
              <NumberInput
                aria-label="Футов движения"
                min={MOVEMENT_FEET_STEP}
                max={MOVEMENT_FEET_MAX}
                step={MOVEMENT_FEET_STEP}
                allowDecimal={false}
                allowNegative={false}
                rightSection="фт."
                rightSectionWidth={36}
                w={110}
                {...form.getInputProps('usage.movementFeet')}
              />
            )}
          </Group>
        )}
        {kinds.includes('hitDie') && (
          <Checkbox
            label="Кость хитов"
            {...form.getInputProps('usage.hitDie', { type: 'checkbox' })}
          />
        )}
      </Stack>
    </Input.Wrapper>
  );
}

export default CostsFields;
