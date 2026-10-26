import { Modal, Stack, Tabs, TextInput } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconSearch } from '@tabler/icons-react';
import { useState } from 'react';
import PickerSection from '../BlockPicker/PickerSection';
import type { CatalogFound } from '../objects/catalogChoice';
import CatalogTab from './CatalogTab';
import ObjectTile from './ObjectTile';
import { recentKey, type ObjectChoice, type RecentPlace } from './placeChoice';

const isUnique = (entry: CatalogFound) => entry.role === 'unique';

// Вкладки окна существ (пользователь, 2026-10-26): обычные монстры, уникальные и НПС.
const TABS = [
  {
    value: 'monster',
    label: 'Существа',
    kinds: ['monster'],
    filter: (entry: CatalogFound) => !isUnique(entry),
    empty: 'Монстров нет — ни своих, ни опубликованных.',
  },
  {
    value: 'unique',
    label: 'Уникальные',
    kinds: ['monster'],
    filter: isUnique,
    empty: 'Уникальных монстров нет: роль «Уникальный» ставится в справочнике.',
  },
  {
    value: 'npc',
    label: 'НПС',
    kinds: ['npc'],
    filter: undefined,
    empty: 'Своих НПС нет.',
  },
] as const;
type Tab = (typeof TABS)[number]['value'];

// Вкладка текущего выбора. «Уникальный» — в конце подписи записи (catalogLabel): так
// узнаются и выборы из недавних, сохранённые раньше.
const tabOf = (choice: ObjectChoice | null): Tab => {
  if (!choice || !('entry' in choice)) return 'monster';
  if (choice.entry.kind === 'npc') return 'npc';
  return choice.entry.label.endsWith('уникальный') ? 'unique' : 'monster';
};

interface CreaturePickerModalProps {
  current: ObjectChoice | null;
  // Недавние существа — те же, что в «Что поставить», без блоков и вещей.
  recent: readonly RecentPlace[];
  onPick: (choice: ObjectChoice) => void;
  onClose: () => void;
}

// Окно «Какое существо поставить» инструмента «Существа» на сцене игры (замечания после
// первой партии, 2026-10-26): как «Что поставить», но только монстры и НПС, с поиском и
// недавними. Выбор закрывает окно.
function CreaturePickerModal({
  current,
  recent,
  onPick,
  onClose,
}: CreaturePickerModalProps) {
  const [query, setQuery] = useState('');
  const [debounced] = useDebouncedValue(query, 250);
  const [tab, setTab] = useState<Tab>(tabOf(current));
  const currentKey = current && recentKey({ type: 'object', choice: current });
  const tiles = recent.flatMap((r) =>
    r.type === 'object'
      ? [
          <ObjectTile
            key={recentKey(r)}
            choice={r.choice}
            selected={recentKey(r) === currentKey}
            onClick={() => onPick(r.choice)}
          />,
        ]
      : [],
  );

  return (
    <Modal opened onClose={onClose} title="Какое существо поставить" size="lg">
      <Stack gap="md">
        <TextInput
          data-autofocus
          placeholder="Поиск: гоблин, крыса, Серафина…"
          leftSection={<IconSearch size={16} />}
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          aria-label="Поиск"
        />
        {query.trim() ? (
          <CatalogTab
            kinds={['monster', 'npc']}
            q={debounced}
            current={current}
            onPick={onPick}
          />
        ) : (
          <>
            {tiles.length > 0 && (
              <PickerSection title="Недавние">{tiles}</PickerSection>
            )}
            <Tabs
              value={tab}
              onChange={(value) => setTab(value as Tab)}
              // Скрытые вкладки не ищут: иначе окно спрашивало бы сервер трижды.
              keepMounted={false}
            >
              <Tabs.List>
                {TABS.map(({ value, label }) => (
                  <Tabs.Tab key={value} value={value}>
                    {label}
                  </Tabs.Tab>
                ))}
              </Tabs.List>
              {TABS.map(({ value, kinds, filter, empty }) => (
                <Tabs.Panel key={value} value={value} pt="sm">
                  <CatalogTab
                    kinds={kinds}
                    filter={filter}
                    emptyText={empty}
                    current={current}
                    onPick={onPick}
                  />
                </Tabs.Panel>
              ))}
            </Tabs>
          </>
        )}
      </Stack>
    </Modal>
  );
}

export default CreaturePickerModal;
