import {
  Checkbox,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import {
  BOOK_SHIELD,
  ITEM_MAGIC_BONUS_MAX,
  WEAR_SLOTS,
  isEquipmentCategory,
} from 'shared';
import { WEAR_SLOT_HINTS, WEAR_SLOT_LABELS } from '../../equipmentLabels';
import type { ItemFormValues } from '../itemFormValues';
import ArmorFields from './ArmorFields';
import WeaponFields from './WeaponFields';

const SLOT_OPTIONS = WEAR_SLOTS.map((value) => ({
  value,
  label: WEAR_SLOT_LABELS[value],
}));
const BONUS_OPTIONS = Array.from(
  { length: ITEM_MAGIC_BONUS_MAX + 1 },
  (_, bonus) => ({ value: String(bonus), label: bonus ? `+${bonus}` : 'Нет' }),
);
const BONUS_HINTS = {
  weapon: 'К атаке и урону',
  armor: 'К КД',
  shield: 'К КД',
} as const;

interface EquipmentFieldsProps {
  form: UseFormReturnType<ItemFormValues>;
}

// Бонус магии и настройка — у магического предмета, то есть с редкостью. У немагического
// поля скрыты, а подсказка говорит, как их открыть.
function MagicFields({ form }: EquipmentFieldsProps) {
  const { category, rarity } = form.values;
  if (rarity === 'none')
    return (
      <Text size="xs" c="dimmed">
        Бонус магии и настройка — у магического предмета: выберите редкость.
      </Text>
    );
  const bonusHint =
    category === 'weapon' || category === 'armor' || category === 'shield'
      ? BONUS_HINTS[category]
      : null;
  return (
    <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="xs">
      {bonusHint && (
        <Select
          label="Бонус магии"
          description={bonusHint}
          data={BONUS_OPTIONS}
          allowDeselect={false}
          {...form.getInputProps('magicBonus')}
        />
      )}
      <Checkbox
        label="Требует настройки"
        description="На кукле — не больше трёх настроенных предметов"
        mt={bonusHint ? 'xl' : 0}
        {...form.getInputProps('attunement', { type: 'checkbox' })}
      />
    </SimpleGrid>
  );
}

// Свои поля категорий экипировки: оружие, доспех, щит, одежда и украшения.
function EquipmentFields({ form }: EquipmentFieldsProps) {
  const { category, wearableSlot } = form.values;
  if (!isEquipmentCategory(category)) return null;
  return (
    <Stack gap="sm">
      {category === 'weapon' && <WeaponFields form={form} />}
      {category === 'armor' && <ArmorFields form={form} />}
      {category === 'shield' && (
        <SimpleGrid cols={{ base: 1, xs: 2 }}>
          <NumberInput
            label="Бонус к КД"
            description={`У щита книги +${BOOK_SHIELD.armorClass}. Надеть или снять — действием «Использование»`}
            required
            min={0}
            allowDecimal={false}
            allowNegative={false}
            leftSection="+"
            {...form.getInputProps('shieldArmorClass')}
          />
        </SimpleGrid>
      )}
      {category === 'wearable' && (
        <SimpleGrid cols={{ base: 1, xs: 2 }}>
          <Select
            label="Место"
            description={
              wearableSlot
                ? WEAR_SLOT_HINTS[wearableSlot]
                : 'Куда надевается на кукле'
            }
            placeholder="Выберите место"
            required
            data={SLOT_OPTIONS}
            allowDeselect={false}
            {...form.getInputProps('wearableSlot')}
          />
        </SimpleGrid>
      )}
      <MagicFields form={form} />
    </Stack>
  );
}

export default EquipmentFields;
