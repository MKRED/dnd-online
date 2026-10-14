import { NumberInput, Select, SimpleGrid } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { ITEM_MAX_WEIGHT, ITEM_SATIETY_MAX, TREASURE_KINDS } from 'shared';
import { TREASURE_KIND_LABELS } from '../itemLabels';
import type { ItemFormValues } from './itemFormValues';
import PackContentsField from './PackContentsField';

const TREASURE_KIND_OPTIONS = TREASURE_KINDS.map((value) => ({
  value,
  label: TREASURE_KIND_LABELS[value],
}));

interface CategoryFieldsProps {
  form: UseFormReturnType<ItemFormValues>;
  // Предмет на сервере; null — ещё не создан. Нужен составу набора, чтобы не класть
  // предмет в самого себя.
  itemId: string | null;
}

// Свои поля категории (details). У категорий без своих полей — ничего.
function CategoryFields({ form, itemId }: CategoryFieldsProps) {
  return (
    <>
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
      {form.values.category === 'container' && (
        <SimpleGrid cols={{ base: 1, xs: 2 }}>
          <NumberInput
            label="Груз"
            description="Сколько вмещает. Пусто — не указан"
            min={0}
            max={ITEM_MAX_WEIGHT}
            step={0.25}
            decimalScale={2}
            decimalSeparator=","
            allowNegative={false}
            rightSection="фнт."
            rightSectionWidth={44}
            {...form.getInputProps('capacity')}
          />
        </SimpleGrid>
      )}
      {form.values.category === 'pack' && (
        <PackContentsField form={form} selfId={itemId} />
      )}
    </>
  );
}

export default CategoryFields;
