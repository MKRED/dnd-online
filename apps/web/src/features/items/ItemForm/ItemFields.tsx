import {
  Group,
  NumberInput,
  Select,
  Stack,
  Switch,
  Textarea,
  TextInput,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { COINS, ITEM_RARITIES, ITEM_CATEGORIES } from 'shared';
import { CATEGORY_LABELS, COIN_LABELS, RARITY_LABELS } from '../itemLabels';
import type { ItemFormValues } from './itemFormValues';

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
      <Group grow align="flex-start">
        {/* Категория пока одна; поле уже здесь, чтобы с новыми категориями форма не
            переделывалась. */}
        <Select
          label="Категория"
          data={CATEGORY_OPTIONS}
          value="basic"
          allowDeselect={false}
          readOnly
        />
        <Select
          label="Редкость"
          description="У немагических предметов редкости нет"
          data={RARITY_OPTIONS}
          allowDeselect={false}
          {...form.getInputProps('rarity')}
        />
      </Group>
      <Group grow align="flex-start">
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
      </Group>
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
