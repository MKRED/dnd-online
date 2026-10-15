import { Chip, Group, Select, Stack, Text } from '@mantine/core';
import { ITEM_CATEGORIES, ITEM_RARITIES, type ItemCategory } from 'shared';
import { SearchField } from '../../catalog';
import { CATEGORY_LABELS, RARITY_LABELS } from '../itemLabels';
import {
  ITEM_SORTS,
  type ItemFilters as Filters,
  type ItemRarityFilter,
  type ItemSort,
} from './filterParams';

const RARITY_OPTIONS: { value: ItemRarityFilter; label: string }[] = [
  { value: 'any', label: 'Любая редкость' },
  { value: 'none', label: RARITY_LABELS.none },
  { value: 'magic', label: 'Магические' },
  ...ITEM_RARITIES.filter((rarity) => rarity !== 'none').map((value) => ({
    value,
    label: RARITY_LABELS[value],
  })),
];

const SORT_LABELS: Record<ItemSort, string> = {
  recent: 'Сначала новые',
  name: 'По названию',
  weight: 'Сначала лёгкие',
  cost: 'Сначала дешёвые',
};
const SORT_OPTIONS = ITEM_SORTS.map((value) => ({
  value,
  label: SORT_LABELS[value],
}));

interface ItemFiltersProps {
  filters: Filters;
  counts: Record<ItemCategory, number>;
  onChange: (filters: Filters) => void;
}

// Панель над списком предметов: поиск, категории чипами, редкость и сортировка.
function ItemFilters({ filters, counts, onChange }: ItemFiltersProps) {
  const update = (patch: Partial<Filters>) =>
    onChange({ ...filters, ...patch });

  return (
    <Stack gap="sm" mb="lg">
      <SearchField
        value={filters.query}
        onChange={(query) => update({ query })}
      />
      <Group gap={6} role="group" aria-label="Категории">
        <Chip
          size="sm"
          checked={filters.categories.length === 0}
          onChange={() => update({ categories: [] })}
        >
          Все
        </Chip>
        <Chip.Group
          multiple
          value={filters.categories}
          onChange={(value) => update({ categories: value })}
        >
          {ITEM_CATEGORIES.map((category) => (
            <Chip key={category} value={category} size="sm">
              {CATEGORY_LABELS[category]}{' '}
              {/* Цвет надписи, а не dimmed: на закрашенном выбранном чипе серый не виден. */}
              <Text span size="xs" c="inherit" opacity={0.7}>
                {counts[category]}
              </Text>
            </Chip>
          ))}
        </Chip.Group>
      </Group>
      <Group justify="space-between" gap="sm" wrap="nowrap">
        <Select
          aria-label="Редкость"
          data={RARITY_OPTIONS}
          value={filters.rarity}
          allowDeselect={false}
          onChange={(value) => update({ rarity: value ?? 'any' })}
          style={{ flex: 1, maxWidth: 220 }}
        />
        <Select
          aria-label="Сортировка"
          data={SORT_OPTIONS}
          value={filters.sort}
          allowDeselect={false}
          onChange={(value) => update({ sort: value ?? 'recent' })}
          style={{ flex: 1, maxWidth: 220 }}
        />
      </Group>
    </Stack>
  );
}

export default ItemFilters;
