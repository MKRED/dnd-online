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
  CLOTHING_SLOTS,
  JEWELRY_SLOTS,
  isEquipmentCategory,
  type WearSlot,
} from 'shared';
import { WEAR_SLOT_HINTS, WEAR_SLOT_LABELS } from '../../equipmentLabels';
import type { ItemFormValues } from '../itemFormValues';
import ArmorFields from './ArmorFields';
import WeaponFields from './WeaponFields';

const slotOptions = (slots: readonly WearSlot[]) =>
  slots.map((value) => ({ value, label: WEAR_SLOT_LABELS[value] }));
const SLOT_FIELDS = {
  clothing: { path: 'clothingSlot', options: slotOptions(CLOTHING_SLOTS) },
  jewelry: { path: 'jewelrySlot', options: slotOptions(JEWELRY_SLOTS) },
} as const;
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
  // Без настройки по книге действуют только обычные свойства; отметка — «если в описании
  // не сказано иначе» (docs/dnd/weapons-armor.md, «Магия без настройки»).
  const markBonus = form.values.attunement && form.values.magicBonus !== '0';
  return (
    <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="xs">
      {bonusHint && (
        <Stack gap={6}>
          <Select
            label="Бонус магии"
            description={bonusHint}
            data={BONUS_OPTIONS}
            allowDeselect={false}
            {...form.getInputProps('magicBonus')}
          />
          {markBonus && (
            <Checkbox
              size="xs"
              label="Действует без настройки"
              {...form.getInputProps('bonusWithoutAttunement', {
                type: 'checkbox',
              })}
            />
          )}
        </Stack>
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

// Место на кукле: у одежды и украшений свои списки.
function SlotField({
  form,
  category,
}: EquipmentFieldsProps & { category: keyof typeof SLOT_FIELDS }) {
  const { path, options } = SLOT_FIELDS[category];
  const slot = form.values[path];
  return (
    <SimpleGrid cols={{ base: 1, xs: 2 }}>
      <Select
        label="Место"
        description={slot ? WEAR_SLOT_HINTS[slot] : 'Куда надевается на кукле'}
        placeholder="Выберите место"
        required
        data={options}
        allowDeselect={false}
        {...form.getInputProps(path)}
      />
    </SimpleGrid>
  );
}

// Свои поля категорий экипировки: оружие, доспех, щит, одежда и украшения.
function EquipmentFields({ form }: EquipmentFieldsProps) {
  const { category } = form.values;
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
      {(category === 'clothing' || category === 'jewelry') && (
        <SlotField form={form} category={category} />
      )}
      <MagicFields form={form} />
    </Stack>
  );
}

export default EquipmentFields;
