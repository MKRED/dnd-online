import {
  Chip,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { AMMUNITION_KINDS, DAMAGE_DICE } from 'shared';
import { AMMUNITION_LABELS, WEAPON_FLAG_LABELS } from '../../equipmentLabels';
import type { ItemFormValues } from '../itemFormValues';
import {
  WEAPON_PROPERTY_CHIPS,
  chipFits,
  type WeaponPropertyChip,
} from './weaponPropertyChips';

const VERSATILE_DIE_OPTIONS = DAMAGE_DICE.map((die) => ({
  value: `${die}`,
  label: `к${die}`,
}));
const AMMO_OPTIONS = AMMUNITION_KINDS.map((value) => ({
  value,
  label: AMMUNITION_LABELS[value],
}));
const CHIP_LABELS: Record<WeaponPropertyChip, string> = {
  ...WEAPON_FLAG_LABELS,
  thrown: 'Метательное',
  ammunition: 'Боеприпас',
  versatile: 'Универсальное',
};

interface WeaponPropertyFieldsProps {
  form: UseFormReturnType<ItemFormValues>;
}

// Свойства оружия рядом чипов; у Метательного, Боеприпаса и Универсального под ними
// раскрываются их параметры.
function WeaponPropertyFields({ form }: WeaponPropertyFieldsProps) {
  const { weapon } = form.values;
  // Чипы другого вида атаки скрыты, но выбор в них хранится: вернёшь вид — вернутся.
  const chips = WEAPON_PROPERTY_CHIPS.filter((chip) =>
    chipFits(chip, weapon.attackType),
  );
  const has = (chip: WeaponPropertyChip) =>
    weapon.properties.includes(chip) && chipFits(chip, weapon.attackType);
  return (
    <>
      <Stack gap={4}>
        <Text size="sm" fw={500}>
          Свойства
        </Text>
        <Chip.Group
          multiple
          value={weapon.properties.filter((chip) => chips.includes(chip))}
          onChange={(value) =>
            form.setFieldValue(
              'weapon.properties',
              WEAPON_PROPERTY_CHIPS.filter((chip) =>
                chips.includes(chip)
                  ? value.includes(chip)
                  : weapon.properties.includes(chip),
              ),
            )
          }
        >
          <Group gap={6}>
            {chips.map((chip) => (
              <Chip key={chip} value={chip} size="xs">
                {CHIP_LABELS[chip]}
              </Chip>
            ))}
          </Group>
        </Chip.Group>
      </Stack>
      {has('thrown') && (
        <SimpleGrid cols={2} spacing="xs">
          <NumberInput
            label="Метание: обычная"
            rightSection="фт."
            min={5}
            step={5}
            allowDecimal={false}
            {...form.getInputProps('weapon.thrownNormal')}
          />
          <NumberInput
            label="наибольшая"
            rightSection="фт."
            min={5}
            step={5}
            allowDecimal={false}
            {...form.getInputProps('weapon.thrownLong')}
          />
        </SimpleGrid>
      )}
      {has('ammunition') && (
        <SimpleGrid cols={{ base: 2, xs: 3 }} spacing="xs">
          <NumberInput
            label="Стрельба: обычная"
            rightSection="фт."
            min={5}
            step={5}
            allowDecimal={false}
            {...form.getInputProps('weapon.ammoNormal')}
          />
          <NumberInput
            label="наибольшая"
            rightSection="фт."
            min={5}
            step={5}
            allowDecimal={false}
            {...form.getInputProps('weapon.ammoLong')}
          />
          <Select
            label="Боеприпас"
            placeholder="Выберите"
            data={AMMO_OPTIONS}
            allowDeselect={false}
            {...form.getInputProps('weapon.ammoKind')}
          />
        </SimpleGrid>
      )}
      {has('versatile') && (
        <Group gap="xs" align="flex-start" wrap="nowrap">
          <NumberInput
            label="Двумя руками"
            min={1}
            allowDecimal={false}
            allowNegative={false}
            w={120}
            {...form.getInputProps('weapon.versatileCount')}
          />
          <Select
            label="Кубик"
            aria-label="Кубик урона двумя руками"
            data={VERSATILE_DIE_OPTIONS}
            allowDeselect={false}
            w={96}
            {...form.getInputProps('weapon.versatileDie')}
          />
        </Group>
      )}
    </>
  );
}

export default WeaponPropertyFields;
