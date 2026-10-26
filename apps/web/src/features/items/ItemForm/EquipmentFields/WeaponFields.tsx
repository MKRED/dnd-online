import {
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import {
  BOOK_WEAPONS,
  WEAPON_MASTERIES,
  WEAPONS_BY_GROUP,
  type Weapon,
  type WeaponGroup,
} from 'shared';
import {
  WEAPON_GROUP_LABELS,
  WEAPON_LABELS,
} from '../../../characters/characterWeapons';
import { WEAPON_MASTERY_LABELS } from '../../equipmentLabels';
import type { ItemFormValues } from '../itemFormValues';
import DamageFields from './DamageFields';
import { weaponBookDifferences, weaponFromBook } from './weaponFormValues';
import WeaponPropertyFields from './WeaponPropertyFields';

const BASE_OPTIONS = (Object.keys(WEAPONS_BY_GROUP) as WeaponGroup[]).map(
  (group) => ({
    group: WEAPON_GROUP_LABELS[group],
    items: WEAPONS_BY_GROUP[group].map((value) => ({
      value,
      label: WEAPON_LABELS[value],
    })),
  }),
);
const MASTERY_OPTIONS = WEAPON_MASTERIES.map((value) => ({
  value,
  label: WEAPON_MASTERY_LABELS[value],
}));

function baseHint(values: ItemFormValues): string {
  if (!values.weapon.base)
    return 'Заполнит поля, вес и стоимость по книге. По нему же считается владение';
  const diff = weaponBookDifferences(values.weapon);
  return diff.length === 0
    ? 'Как в книге'
    : `Отличается от книги: ${diff.join(', ')}`;
}

interface WeaponFieldsProps {
  form: UseFormReturnType<ItemFormValues>;
}

// Поля оружия: образец из книги заполняет их, дальше их можно править (вариант А макета).
function WeaponFields({ form }: WeaponFieldsProps) {
  const { weapon } = form.values;

  const pickBase = (value: string | null) => {
    if (!value) {
      form.setFieldValue('weapon.base', null);
      return;
    }
    const base = value as Weapon;
    const { weight, cost } = BOOK_WEAPONS[base];
    form.setFieldValue('weapon', weaponFromBook(base));
    form.setFieldValue('weight', weight);
    form.setFieldValue('costAmount', cost.amount);
    form.setFieldValue('costCoin', cost.coin);
    if (form.values.name.trim() === '')
      form.setFieldValue('name', WEAPON_LABELS[base]);
  };

  return (
    <Stack gap="sm">
      <Select
        label="Образец из книги"
        description={baseHint(form.values)}
        placeholder="Своё оружие"
        data={BASE_OPTIONS}
        searchable
        clearable
        nothingFoundMessage="Такого оружия в книге нет"
        value={weapon.base}
        onChange={pickBase}
      />
      <Stack gap={4}>
        <Text size="sm" fw={500}>
          Вид
        </Text>
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md" verticalSpacing="xs">
          <SegmentedControl
            aria-label="Простое или воинское"
            data={[
              { value: 'simple', label: 'Простое' },
              { value: 'martial', label: 'Воинское' },
            ]}
            {...form.getInputProps('weapon.weaponCategory')}
          />
          <SegmentedControl
            aria-label="Рукопашное или дальнобойное"
            data={[
              { value: 'melee', label: 'Рукопашное' },
              { value: 'ranged', label: 'Дальнобойное' },
            ]}
            {...form.getInputProps('weapon.attackType')}
          />
        </SimpleGrid>
      </Stack>
      <DamageFields form={form} />
      <WeaponPropertyFields form={form} />
      <Select
        label="Мастерство"
        description="Работает, если у персонажа открыто мастерство этого оружия"
        placeholder="Нет"
        data={MASTERY_OPTIONS}
        clearable
        {...form.getInputProps('weapon.mastery')}
      />
    </Stack>
  );
}

export default WeaponFields;
