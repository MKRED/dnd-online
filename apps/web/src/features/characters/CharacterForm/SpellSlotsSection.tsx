import { Fieldset, NumberInput, SimpleGrid, Text } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { memo } from 'react';
import { SPELL_SLOT_CIRCLES, SPELL_SLOT_TOTAL_MAX } from 'shared';
import type { CharacterFormValues } from '../characterFormValues';
import { formErrorsEqual } from './formSectionMemo';

interface SpellSlotsSectionProps {
  form: UseFormReturnType<CharacterFormValues>;
}

// Число ячеек по кругам вводит игрок: приложение таблицы классов не считает
// (docs/plan/character-abilities.md). Потраченные отмечаются на листе, не здесь.
function SpellSlotsSection({ form }: SpellSlotsSectionProps) {
  return (
    <Fieldset legend="Ячейки заклинаний">
      <Text size="sm" c="dimmed" mb="sm">
        Сколько ячеек каждого круга — по таблице вашего класса. Потраченные
        отмечаются на листе персонажа.
      </Text>
      <SimpleGrid cols={{ base: 3, xs: 5, sm: 9 }} spacing="xs">
        {SPELL_SLOT_CIRCLES.map((level) => (
          <NumberInput
            key={level}
            label={`${level} круг`}
            min={0}
            max={SPELL_SLOT_TOTAL_MAX}
            allowDecimal={false}
            allowNegative={false}
            {...form.getInputProps(`spellSlots.${level}`)}
          />
        ))}
      </SimpleGrid>
    </Fieldset>
  );
}

export default memo(SpellSlotsSection, formErrorsEqual);
