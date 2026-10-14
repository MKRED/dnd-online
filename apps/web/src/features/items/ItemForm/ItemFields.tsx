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
import {
  COINS,
  ITEM_CATEGORIES,
  ITEM_RARITIES,
  ITEM_SATIETY_MAX,
  TREASURE_KINDS,
} from 'shared';
import {
  CATEGORY_HINTS,
  CATEGORY_LABELS,
  COIN_LABELS,
  RARITY_LABELS,
  TREASURE_KIND_LABELS,
} from '../itemLabels';
import type { ItemFormValues } from './itemFormValues';

const CATEGORY_OPTIONS = ITEM_CATEGORIES.map((value) => ({
  value,
  label: CATEGORY_LABELS[value],
}));
const TREASURE_KIND_OPTIONS = TREASURE_KINDS.map((value) => ({
  value,
  label: TREASURE_KIND_LABELS[value],
}));
const RARITY_OPTIONS = ITEM_RARITIES.map((value) => ({
  value,
  label: RARITY_LABELS[value],
}));
const COIN_OPTIONS = COINS.map((value) => ({
  value,
  label: COIN_LABELS[value],
}));

// Поля предмета, общие для всех категорий.
function ItemFields({ form }: { form: UseFormReturnType<ItemFormValues> }) {
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
      {form.values.category === 'food' && (
        <SimpleGrid cols={{ base: 1, xs: 2 }}>
          <NumberInput
            label="Насыщение"
            description="Очки: сколько насыщает еда или напиток"
            required
            min={0}
            max={ITEM_SATIETY_MAX}
            allowDecimal={false}
            allowNegative={false}
            rightSection="очк."
            rightSectionWidth={44}
            {...form.getInputProps('satiety')}
          />
        </SimpleGrid>
      )}
      {form.values.category === 'treasure' && (
        <SimpleGrid cols={{ base: 1, xs: 2 }}>
          <Select
            label="Вид"
            description="Цену укажите в «Стоимости»"
            placeholder="Выберите вид"
            required
            data={TREASURE_KIND_OPTIONS}
            allowDeselect={false}
            {...form.getInputProps('treasureKind')}
          />
        </SimpleGrid>
      )}
      <SimpleGrid cols={{ base: 1, xs: 2 }}>
        <NumberInput
          label="Вес"
          description="0 — без веса"
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
