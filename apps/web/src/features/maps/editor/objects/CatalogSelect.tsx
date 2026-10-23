import { Select } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { useEffect, useMemo, useState } from 'react';
import {
  CREATURE_SIZES,
  type CreatureSize,
  type MapCatalogEntry,
} from 'shared';
import { errorMessage } from '../../../../lib/apiRequest';
import { searchMapCatalog } from '../../mapsApi';
import type { CatalogChoice } from './objectPlacement';

type CatalogKind = CatalogChoice['kind'];

const GROUP_LABELS: Record<CatalogKind, string> = {
  monster: 'Монстры',
  npc: 'НПС',
  item: 'Предметы',
  furniture: 'Обстановка',
};

const MOUNT_SHORT: Record<string, string> = {
  floor: 'на полу',
  wall: 'на стене',
  ceiling: 'на потолке',
  doorway: 'в проёме',
};

interface Found extends MapCatalogEntry {
  kind: CatalogKind;
}

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

const isSize = (size: string | undefined): size is CreatureSize =>
  size !== undefined && size in CREATURE_SIZES;

const optionValue = ({ kind, id }: { kind: CatalogKind; id: string }) =>
  `${kind}:${id}`;

function optionLabel(entry: Found): string {
  const parts = [entry.name];
  if (isSize(entry.size)) parts.push(CREATURE_SIZES[entry.size].label);
  if (entry.role === 'unique') parts.push('уникальный');
  // Обстановка: размер модели «ширина×глубина×высота» и крепление.
  if (entry.modelSize) {
    const [x, y, z] = entry.modelSize;
    parts.push(`${x}×${z}×${y}`);
  }
  if (entry.mount) parts.push(MOUNT_SHORT[entry.mount] ?? entry.mount);
  return parts.join(' · ');
}

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
  const [result, setResult] = useState<{ key: string; found: Found[] }>();
  const [loadError, setLoadError] = useState<string | null>(null);
  // Выбранная запись пишется в поле своей подписью — искать по ней не нужно.
  const q = query === value?.label ? '' : query;
  const kindsKey = kinds.join(',');
  const key = `${kindsKey}|${q}`;

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      (kindsKey.split(',') as CatalogKind[]).map((kind) =>
        searchMapCatalog(kind, q).then((entries) =>
          entries.map((entry): Found => ({ ...entry, kind })),
        ),
      ),
    )
      .then((lists) => {
        if (cancelled) return;
        setResult({ key, found: lists.flat() });
        setLoadError(null);
      })
      .catch((err: unknown) => {
        console.error('Failed to search map catalog', err);
        if (!cancelled) setLoadError(errorMessage(err, 'Поиск не удался'));
      });
    return () => {
      cancelled = true;
    };
  }, [kindsKey, q, key]);

  const found = useMemo(() => result?.found ?? [], [result]);
  const data = useMemo(() => {
    const options = (kind: CatalogKind) => {
      const list = found
        .filter((entry) => entry.kind === kind)
        .map((entry) => ({
          value: optionValue(entry),
          label: optionLabel(entry),
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
    onChange({
      kind: entry.kind,
      id: entry.id,
      name: entry.name,
      label: optionLabel(entry),
      ...(isSize(entry.size) && { size: entry.size }),
      ...(entry.modelSize?.length === 3 && {
        modelSize: entry.modelSize as unknown as [number, number, number],
      }),
    });
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
      nothingFoundMessage={result?.key === key ? 'Ничего не нашлось' : 'Ищем…'}
      error={loadError ?? error}
      allowDeselect={false}
      maxDropdownHeight={280}
      comboboxProps={{ withinPortal: true }}
    />
  );
}

export default CatalogSelect;
