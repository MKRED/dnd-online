import { Chip, Group, Text } from '@mantine/core';
import type { SimpleCatalogDef, SimpleEntry } from './simpleCatalogs';

interface CategoryChipsProps {
  def: SimpleCatalogDef;
  // Все записи вкладки — по ним считаем, сколько в каждой категории.
  entries: SimpleEntry[];
  value: string[];
  onChange: (categories: string[]) => void;
}

// Категории чипами с числом записей, как у предметов (ItemFilters). Ничего не выбрано —
// «Все».
function CategoryChips({ def, entries, value, onChange }: CategoryChipsProps) {
  const count = (category: string) =>
    entries.filter((entry) => entry.category === category).length;

  return (
    <Group gap={6} role="group" aria-label="Категории">
      <Chip
        size="sm"
        checked={value.length === 0}
        onChange={() => onChange([])}
      >
        Все
      </Chip>
      <Chip.Group multiple value={value} onChange={onChange}>
        {def.categories.map((category) => (
          <Chip key={category} value={category} size="sm">
            {def.categoryLabels[category]}{' '}
            {/* Цвет надписи, а не dimmed: на закрашенном выбранном чипе серый не виден. */}
            <Text span size="xs" c="inherit" opacity={0.7}>
              {count(category)}
            </Text>
          </Chip>
        ))}
      </Chip.Group>
    </Group>
  );
}

export default CategoryChips;
