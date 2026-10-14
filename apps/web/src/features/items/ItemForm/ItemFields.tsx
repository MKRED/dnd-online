import {
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Textarea,
  TextInput,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { COINS, ITEM_CATEGORIES, ITEM_RARITIES } from 'shared';
import {
  CATEGORY_HINTS,
  CATEGORY_LABELS,
  COIN_LABELS,
  RARITY_LABELS,
  formatWeight,
} from '../itemLabels';
import CategoryFields from './CategoryFields';
import type { ItemFormValues } from './itemFormValues';
import { packWeight } from './PackContentsField';

const CATEGORY_OPTIONS = ITEM_CATEGORIES.map((value) => ({
  value,
  label: CATEGORY_LABELS[value],
}));
const RARITY_OPTIONS = ITEM_RARITIES.map((value) => ({
  value,
  label: RARITY_LABELS[value],
}));
const COIN_OPTIONS = COINS.map((value) => ({
  value,
  label: COIN_LABELS[value],
}));

interface ItemFieldsProps {
  form: UseFormReturnType<ItemFormValues>;
  itemId: string | null;
}

// Подсказка под весом. У набора вес вводят сами, как в книге, а рядом — сколько весит
// состав (решено с пользователем). Строки «скрыт автором» в сумму не входят.
function weightHint({ category, packContents }: ItemFormValues): string {
  if (category !== 'pack' || packContents.length === 0) return '0 — без веса';
  const { total, partial } = packWeight(packContents);
  if (total === 0)
    return partial ? 'Вес скрытых предметов неизвестен' : 'Состав без веса';
  return `Состав весит ${partial ? 'не меньше ' : ''}${formatWeight(total)}`;
}

// Поля предмета, общие для всех категорий.
function ItemFields({ form, itemId }: ItemFieldsProps) {
  return (
    <Stack>
      <TextInput
        label="Название"
        required
        placeholder="Например, Верёвка пеньковая"
        {...form.getInputProps('name')}
      />
      <SimpleGrid cols={{ base: 1, xs: 2 }}>
        <Select
          label="Категория"
          description={CATEGORY_HINTS[form.values.category]}
          data={CATEGORY_OPTIONS}
          allowDeselect={false}
          {...form.getInputProps('category')}
        />
        <Select
          label="Редкость"
          description="У немагических предметов редкости нет"
          data={RARITY_OPTIONS}
          allowDeselect={false}
          {...form.getInputProps('rarity')}
        />
      </SimpleGrid>
      {/* Поля категории — сразу под ней, чтобы было видно, откуда они взялись. */}
      <CategoryFields form={form} itemId={itemId} />
      <SimpleGrid cols={{ base: 1, xs: 2 }}>
        <NumberInput
          label="Вес"
          description={weightHint(form.values)}
          min={0}
          step={0.25}
          decimalScale={2}
          decimalSeparator=","
          rightSection="фнт."
          rightSectionWidth={44}
          {...form.getInputProps('weight')}
        />
        <Group gap={4} wrap="nowrap" align="flex-end">
          <NumberInput
            label="Стоимость"
            description="Пусто — без цены"
            min={0}
            allowDecimal={false}
            style={{ flex: 1 }}
            {...form.getInputProps('costAmount')}
          />
          <Select
            aria-label="Монета"
            data={COIN_OPTIONS}
            allowDeselect={false}
            w={76}
            {...form.getInputProps('costCoin')}
          />
        </Group>
      </SimpleGrid>
      <Textarea
        label="Описание"
        autosize
        minRows={4}
        maxRows={14}
        {...form.getInputProps('description')}
      />
      <Switch
        label="Показывать в каталоге"
        description="Скрытый предмет видите только вы. Опубликованный видят все, но менять его можете только вы."
        {...form.getInputProps('isPublic', { type: 'checkbox' })}
      />
    </Stack>
  );
}

export default ItemFields;
