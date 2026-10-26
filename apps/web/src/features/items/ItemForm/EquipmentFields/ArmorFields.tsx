import {
  Checkbox,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import {
  ARMOR_DEX_CAP,
  ARMOR_KINDS,
  BOOK_ARMOR,
  BOOK_ARMOR_STATS,
  type ArmorKind,
  type BookArmor,
} from 'shared';
import { ARMOR_KIND_LABELS, BOOK_ARMOR_LABELS } from '../../equipmentLabels';
import type { ItemFormValues } from '../itemFormValues';
import { armorBookDifferences, armorFromBook } from './equipmentFormValues';

const BASE_OPTIONS = ARMOR_KINDS.map((kind) => ({
  group: `${ARMOR_KIND_LABELS[kind]} доспех`,
  items: BOOK_ARMOR.filter((base) => BOOK_ARMOR_STATS[base].kind === kind).map(
    (value) => ({ value, label: BOOK_ARMOR_LABELS[value] }),
  ),
}));
const KIND_OPTIONS = ARMOR_KINDS.map((value) => ({
  value,
  label: ARMOR_KIND_LABELS[value],
}));

// Ловкость и время надеть/снять следуют из вида — своих полей у них нет (книга 2024).
const DEX_TEXT: Record<ArmorKind, string> = {
  light: 'полностью',
  medium: `не более ${ARMOR_DEX_CAP.medium}`,
  heavy: 'не добавляется',
};
const DON_TEXT: Record<ArmorKind, string> = {
  light: 'Надеть и снять — по 1 минуте',
  medium: 'Надеть — 5 минут, снять — 1 минута',
  heavy: 'Надеть — 10 минут, снять — 5 минут',
};

function baseHint(values: ItemFormValues): string {
  if (!values.armor.base) return 'Заполнит поля, вес и стоимость по книге';
  const diff = armorBookDifferences(values.armor);
  return diff.length === 0
    ? 'Как в книге'
    : `Отличается от книги: ${diff.join(', ')}`;
}

interface ArmorFieldsProps {
  form: UseFormReturnType<ItemFormValues>;
}

// Поля доспеха: образец из книги заполняет их, дальше их можно править.
function ArmorFields({ form }: ArmorFieldsProps) {
  const { armor } = form.values;

  const pickBase = (value: string | null) => {
    if (!value) {
      form.setFieldValue('armor.base', null);
      return;
    }
    const base = value as BookArmor;
    const { weight, cost } = BOOK_ARMOR_STATS[base];
    form.setFieldValue('armor', armorFromBook(base));
    form.setFieldValue('weight', weight);
    form.setFieldValue('costAmount', cost.amount);
    form.setFieldValue('costCoin', cost.coin);
    if (form.values.name.trim() === '')
      form.setFieldValue('name', BOOK_ARMOR_LABELS[base]);
  };

  return (
    <Stack gap="sm">
      <Select
        label="Образец из книги"
        description={baseHint(form.values)}
        placeholder="Свой доспех"
        data={BASE_OPTIONS}
        searchable
        clearable
        nothingFoundMessage="Такого доспеха в книге нет"
        value={armor.base}
        onChange={pickBase}
      />
      <Stack gap={4}>
        <Text size="sm" fw={500}>
          Вид
        </Text>
        <SegmentedControl
          aria-label="Вид доспеха"
          data={KIND_OPTIONS}
          {...form.getInputProps('armor.kind')}
        />
        <Text size="xs" c="dimmed">
          {DON_TEXT[armor.kind]}
        </Text>
      </Stack>
      <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="xs">
        <NumberInput
          label="КД"
          description="Базовый, без Ловкости"
          required
          min={1}
          allowDecimal={false}
          allowNegative={false}
          {...form.getInputProps('armor.armorClass')}
        />
        <TextInput
          label="Ловкость к КД"
          description="Следует из вида"
          value={DEX_TEXT[armor.kind]}
          readOnly
          variant="filled"
        />
        <NumberInput
          label="Требует Силы"
          description="Иначе скорость −10 фт. Пусто — нет"
          min={1}
          allowDecimal={false}
          allowNegative={false}
          {...form.getInputProps('armor.strength')}
        />
      </SimpleGrid>
      <Checkbox
        label="Помеха к Скрытности"
        {...form.getInputProps('armor.stealthDisadvantage', {
          type: 'checkbox',
        })}
      />
    </Stack>
  );
}

export default ArmorFields;
