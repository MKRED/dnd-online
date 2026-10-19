import { Chip, Group, Text } from '@mantine/core';

// Виды записей раздела: значения по порядку, их названия и виды одной записи.
export interface CategoryKinds<Entry> {
  values: readonly string[];
  labels: Record<string, string>;
  of: (entry: Entry) => readonly string[];
}

interface CategoryChipsProps<Entry> {
  kinds: CategoryKinds<Entry>;
  // Все записи вкладки — по ним считаем, сколько в каждой категории.
  entries: Entry[];
  value: string[];
  onChange: (categories: string[]) => void;
  // Прятать виды без записей (выбранные остаются, чтобы выбор можно было снять). Для
  // 14 типов монстров: чипы с нулями заняли бы полэкрана телефона.
  hideEmpty?: boolean;
}

// Виды записей чипами с числом записей, как категории у предметов (ItemFilters). Эффект
// с чувством и уроном считается в обоих чипах. Ничего не выбрано — «Все». Те же чипы
// у типов монстров.
function CategoryChips<Entry>({
  kinds,
  entries,
  value,
  onChange,
  hideEmpty = false,
}: CategoryChipsProps<Entry>) {
  const count = (category: string) =>
    entries.filter((entry) => kinds.of(entry).includes(category)).length;
  const shown = hideEmpty
    ? kinds.values.filter(
        (category) => count(category) > 0 || value.includes(category),
      )
    : kinds.values;

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
        {shown.map((category) => (
          <Chip key={category} value={category} size="sm">
            {kinds.labels[category]}{' '}
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
