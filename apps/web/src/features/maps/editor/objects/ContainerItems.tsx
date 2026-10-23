import { ActionIcon, Box, Group, Stack, Text } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import {
  containerLoad,
  loadLabel,
  OBJECT_QUANTITY_MAX,
  type ItemRefView,
  type ObjectItem,
} from 'shared';
import ItemThumb from '../../../items/ItemThumb';
import CatalogSelect from './CatalogSelect';
import type { CatalogChoice } from './objectPlacement';
import { QuantityInput } from './CommitInputs';

interface ContainerItemsProps {
  items: ObjectItem[];
  // Вместимость в фунтах: у вида контейнера на карте или у контейнера-обстановки.
  capacity: number;
  refs: Record<string, ItemRefView>;
  // Новый список целиком: updateObject заменяет содержимое, а не дописывает. added —
  // предмет, найденный в поиске: форма обстановки запоминает его имя и вес.
  onChange: (items: ObjectItem[], added?: CatalogChoice) => void;
  disabled: boolean;
}

function itemName(ref: ItemRefView | undefined): string {
  if (!ref) return 'Предмет';
  if (ref.missing === null) return ref.name;
  return ref.missing === 'hidden' ? 'Скрыт автором' : 'Предмет удалён';
}

// Содержимое контейнера на карте — по образцу снаряжения монстра: миниатюра, имя,
// количество и «убрать». Уже лежащий предмет при добавлении прибавляет единицу. Над
// списком — груз против вместимости вида; лишнее не пропустит сервер, его ошибку
// покажет редактор.
function ContainerItems({
  items,
  capacity,
  refs,
  onChange,
  disabled,
}: ContainerItemsProps) {
  const add = (choice: CatalogChoice) => {
    const itemId = choice.id;
    const present = items.find((entry) => entry.itemId === itemId);
    onChange(
      present
        ? items.map((entry) =>
            entry === present
              ? {
                  ...entry,
                  quantity: Math.min(entry.quantity + 1, OBJECT_QUANTITY_MAX),
                }
              : entry,
          )
        : [...items, { itemId, quantity: 1 }],
      choice,
    );
  };

  const load = containerLoad(items, (itemId) => {
    const ref = refs[itemId];
    return ref?.missing === null ? ref.weight : 0;
  });

  return (
    <Stack gap={6}>
      <Group justify="space-between" gap="xs">
        <Text size="sm">Содержимое</Text>
        <Text size="xs" c={load > capacity ? 'red' : 'dimmed'}>
          Груз: {loadLabel(load, capacity)}
        </Text>
      </Group>
      {items.length === 0 && (
        <Text size="xs" c="dimmed">
          Пусто.
        </Text>
      )}
      {items.map((entry, index) => {
        const ref = refs[entry.itemId];
        const name = itemName(ref);
        return (
          <Group key={entry.itemId} gap="xs" wrap="nowrap">
            <Box w={24} style={{ flexShrink: 0 }}>
              <ItemThumb
                item={{
                  id: entry.itemId,
                  name: ref?.missing === null ? name : '?',
                  image: ref?.missing === null ? ref.image : null,
                }}
                placeholderSize="0.7rem"
              />
            </Box>
            <Text
              size="sm"
              flex={1}
              lineClamp={2}
              c={ref?.missing === null ? undefined : 'dimmed'}
            >
              {name}
            </Text>
            <QuantityInput
              key={entry.quantity}
              value={entry.quantity}
              aria-label={`Количество: ${name}`}
              w={72}
              disabled={disabled}
              onCommit={(quantity) =>
                onChange(
                  items.map((other, i) =>
                    i === index ? { ...other, quantity } : other,
                  ),
                )
              }
            />
            <ActionIcon
              variant="subtle"
              color="red"
              aria-label={`Убрать: ${name}`}
              disabled={disabled}
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              <IconX size={16} />
            </ActionIcon>
          </Group>
        );
      })}
      <CatalogSelect
        kinds={['item']}
        value={null}
        onChange={add}
        label="Добавить предмет"
        placeholder="Найти по названию"
      />
    </Stack>
  );
}

export default ContainerItems;
