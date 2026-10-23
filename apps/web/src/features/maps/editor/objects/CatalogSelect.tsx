import { Select } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { useMemo, useState } from 'react';
import {
  catalogLabel,
  toCatalogChoice,
  type CatalogKind,
} from './catalogChoice';
import type { CatalogChoice } from './objectPlacement';
import { useMapCatalogSearch } from './useMapCatalogSearch';

const GROUP_LABELS: Record<CatalogKind, string> = {
  monster: 'Монстры',
  npc: 'НПС',
  item: 'Предметы',
  furniture: 'Обстановка',
};

interface CatalogSelectProps {
  // Где искать; у «Существа» — монстры и НПС одним списком по группам.
  kinds: CatalogKind[];
  // Выбранная запись; null — ничего (у «Добавить предмет» всегда null).
  value: CatalogChoice | null;
  onChange: (choice: CatalogChoice) => void;
  label: string;
  placeholder: string;
  error?: string | null;
}

const optionValue = ({ kind, id }: { kind: CatalogKind; id: string }) =>
  `${kind}:${id}`;

// Поиск по каталогу для постановки (GET /map-catalog): то же правило «своё или
// опубликованное», что проверяет сервер. Ищет сервер, по 20 записей, поэтому список
// Mantine не фильтрует сам, а запрос уходит после паузы в наборе.
function CatalogSelect({
  kinds,
  value,
  onChange,
  label,
  placeholder,
  error,
}: CatalogSelectProps) {
  const [search, setSearch] = useState('');
  const [query] = useDebouncedValue(search, 250);
  // Выбранная запись пишется в поле своей подписью — искать по ней не нужно.
  const q = query === value?.label ? '' : query;
  const searched = useMapCatalogSearch(kinds, q);
  const loadError = searched.error;
  const found = searched.last;
  const data = useMemo(() => {
    const options = (kind: CatalogKind) => {
      const list = found
        .filter((entry) => entry.kind === kind)
        .map((entry) => ({
          value: optionValue(entry),
          label: catalogLabel(entry),
        }));
      // Выбранная запись остаётся в списке, даже если новый поиск её не нашёл:
      // иначе поле опустело бы.
      if (
        value?.kind === kind &&
        !list.some((o) => o.value === optionValue(value))
      ) {
        list.unshift({ value: optionValue(value), label: value.label });
      }
      return list;
    };
    return kinds.length === 1
      ? options(kinds[0])
      : kinds.map((kind) => ({
          group: GROUP_LABELS[kind],
          items: options(kind),
        }));
  }, [found, kinds, value]);

  const pick = (picked: string | null) => {
    const entry = found.find((e) => optionValue(e) === picked);
    if (!entry) return;
    onChange(toCatalogChoice(entry));
  };

  return (
    <Select
      label={label}
      placeholder={placeholder}
      data={data}
      value={value ? optionValue(value) : null}
      onChange={(picked) => {
        pick(picked);
        // Без выбранного значения («Добавить предмет») поле очищается для следующего.
        if (!value) setSearch('');
      }}
      searchable
      searchValue={search}
      onSearchChange={setSearch}
      filter={({ options }) => options}
      nothingFoundMessage={searched.found ? 'Ничего не нашлось' : 'Ищем…'}
      error={loadError ?? error}
      allowDeselect={false}
      maxDropdownHeight={280}
      comboboxProps={{ withinPortal: true }}
    />
  );
}

export default CatalogSelect;
