import { Modal, Stack, Tabs, Text, TextInput } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconSearch } from '@tabler/icons-react';
import { useState } from 'react';
import { CONTAINER_LOOKS } from 'shared';
import classes from '../BlockPicker/BlockPicker.module.css';
import BlockPickerBody from '../BlockPicker/BlockPickerBody';
import { searchBlocks } from '../BlockPicker/blockGroups';
import BlockTile from '../BlockPicker/BlockTile';
import { useBlockCatalog } from '../BlockPicker/catalogContext';
import PickerSection from '../BlockPicker/PickerSection';
import CatalogTab from './CatalogTab';
import ObjectTile from './ObjectTile';
import {
  objectChoiceLabel,
  recentKey,
  type ObjectChoice,
  type RecentPlace,
} from './placeChoice';

const TABS = [
  { value: 'block', label: 'Блоки' },
  { value: 'furniture', label: 'Обстановка' },
  { value: 'container', label: 'Контейнеры' },
  { value: 'item', label: 'Предметы' },
  { value: 'creature', label: 'Существа' },
  { value: 'start', label: 'Старты' },
] as const;
type Tab = (typeof TABS)[number]['value'];

const START: ObjectChoice = { kind: 'start' };
const CONTAINERS: ObjectChoice[] = CONTAINER_LOOKS.map((look) => ({
  kind: 'container',
  look,
}));

const normalize = (text: string) =>
  text.toLocaleLowerCase('ru').replaceAll('ё', 'е').trim();

interface PlacePickerModalProps {
  // Текущий блок и текущий объект; null — ставится блок.
  block: string;
  current: ObjectChoice | null;
  recent: readonly RecentPlace[];
  // Заливка, коробка и замена ставят только блок: окно без вкладок объектов.
  blocksOnly: boolean;
  onPickBlock: (block: string) => void;
  onPickObject: (choice: ObjectChoice) => void;
  onClose: () => void;
}

// Окно «Что поставить» (docs/plan/blocks.md, этап 10): общий поиск по блокам и объектам,
// общие недавние и вкладки по ролям. Выбор закрывает окно. Монтируется на время показа —
// открывается на вкладке текущего выбора.
function PlacePickerModal({
  block,
  current,
  recent,
  blocksOnly,
  onPickBlock,
  onPickObject,
  onClose,
}: PlacePickerModalProps) {
  const catalog = useBlockCatalog();
  const [query, setQuery] = useState('');
  const [debounced] = useDebouncedValue(query, 250);
  const [tab, setTab] = useState<Tab>(current?.kind ?? 'block');
  const needle = normalize(query);
  const foundBlocks = searchBlocks(query, catalog);
  const foundObjects = blocksOnly
    ? []
    : [START, ...CONTAINERS].filter((choice) =>
        normalize(objectChoiceLabel(choice)).includes(needle),
      );
  const shownRecent = recent.filter((r) =>
    r.type === 'block' ? catalog.describe(r.name) !== undefined : !blocksOnly,
  );
  const isCurrent = (choice: ObjectChoice) =>
    current !== null &&
    recentKey({ type: 'object', choice: current }) ===
      recentKey({ type: 'object', choice });

  const recentTiles = shownRecent.map((r) =>
    r.type === 'block' ? (
      <BlockTile
        key={recentKey(r)}
        block={r.name}
        label={catalog.describe(r.name)?.label ?? r.name}
        selected={current === null && r.name === block}
        onClick={() => onPickBlock(r.name)}
      />
    ) : (
      <ObjectTile
        key={recentKey(r)}
        choice={r.choice}
        selected={isCurrent(r.choice)}
        onClick={() => onPickObject(r.choice)}
      />
    ),
  );

  return (
    <Modal
      opened
      onClose={onClose}
      title={blocksOnly ? 'Выбор блока' : 'Что поставить'}
      size="lg"
    >
      <Stack gap="md">
        <TextInput
          data-autofocus
          placeholder={
            blocksOnly
              ? 'Поиск: камень, ступени, кам плит…'
              : 'Поиск: камень, стол, гоблин, сундук…'
          }
          leftSection={<IconSearch size={16} />}
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            if (foundBlocks[0]) onPickBlock(foundBlocks[0].name);
            else if (foundObjects[0]) onPickObject(foundObjects[0]);
          }}
          aria-label="Поиск"
        />

        {needle ? (
          <>
            {foundBlocks.length > 0 && (
              <PickerSection title="Блоки">
                {foundBlocks.map((b) => (
                  <BlockTile
                    key={b.name}
                    block={b.name}
                    label={b.label}
                    selected={current === null && b.name === block}
                    onClick={() => onPickBlock(b.name)}
                  />
                ))}
              </PickerSection>
            )}
            {!blocksOnly && (
              <Stack gap={4}>
                <Text size="sm" fw={500}>
                  Объекты
                </Text>
                {foundObjects.length > 0 && (
                  <div className={classes.grid}>
                    {foundObjects.map((choice) => (
                      <ObjectTile
                        key={recentKey({ type: 'object', choice })}
                        choice={choice}
                        selected={isCurrent(choice)}
                        onClick={() => onPickObject(choice)}
                      />
                    ))}
                  </div>
                )}
                <CatalogTab
                  kinds={['furniture', 'item', 'monster', 'npc']}
                  q={debounced}
                  current={current}
                  onPick={onPickObject}
                />
              </Stack>
            )}
            {blocksOnly && foundBlocks.length === 0 && (
              <Text size="sm" c="dimmed">
                Ничего не нашлось.
              </Text>
            )}
          </>
        ) : (
          <>
            {recentTiles.length > 0 && (
              <PickerSection title="Недавние">{recentTiles}</PickerSection>
            )}
            {blocksOnly ? (
              <BlockPickerBody block={block} onPick={onPickBlock} />
            ) : (
              <Tabs value={tab} onChange={(value) => setTab(value as Tab)}>
                <Tabs.List>
                  {TABS.map(({ value, label }) => (
                    <Tabs.Tab key={value} value={value}>
                      {label}
                    </Tabs.Tab>
                  ))}
                </Tabs.List>
                <Tabs.Panel value="block" pt="sm">
                  <BlockPickerBody block={block} onPick={onPickBlock} />
                </Tabs.Panel>
                <Tabs.Panel value="furniture" pt="sm">
                  <CatalogTab
                    kinds={['furniture']}
                    current={current}
                    onPick={onPickObject}
                  />
                </Tabs.Panel>
                <Tabs.Panel value="container" pt="sm">
                  <Stack gap="md">
                    <PickerSection title="Встроенные">
                      {CONTAINERS.map((choice) => (
                        <ObjectTile
                          key={recentKey({ type: 'object', choice })}
                          choice={choice}
                          selected={isCurrent(choice)}
                          onClick={() => onPickObject(choice)}
                        />
                      ))}
                    </PickerSection>
                    {/* Свои — обстановка вида «Контейнер» (этап 11). */}
                    <Stack gap={4}>
                      <Text size="sm" fw={500}>
                        Свои
                      </Text>
                      <CatalogTab
                        kinds={['furniture']}
                        onlyContainers
                        current={current}
                        onPick={onPickObject}
                      />
                    </Stack>
                  </Stack>
                </Tabs.Panel>
                <Tabs.Panel value="item" pt="sm">
                  <CatalogTab
                    kinds={['item']}
                    current={current}
                    onPick={onPickObject}
                  />
                </Tabs.Panel>
                <Tabs.Panel value="creature" pt="sm">
                  <CatalogTab
                    kinds={['monster', 'npc']}
                    current={current}
                    onPick={onPickObject}
                  />
                </Tabs.Panel>
                <Tabs.Panel value="start" pt="sm">
                  <div className={classes.grid}>
                    <ObjectTile
                      choice={START}
                      selected={current?.kind === 'start'}
                      onClick={() => onPickObject(START)}
                    />
                  </div>
                  <Text size="xs" c="dimmed" mt="xs">
                    Точка, где появится персонаж игрока, когда игра начнётся на
                    этой карте.
                  </Text>
                </Tabs.Panel>
              </Tabs>
            )}
          </>
        )}
      </Stack>
    </Modal>
  );
}

export default PlacePickerModal;
