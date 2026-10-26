import {
  CloseButton,
  Group,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  UnstyledButton,
} from '@mantine/core';
import {
  IconArmchair,
  IconBox,
  IconChevronDown,
  IconChevronRight,
  IconDiamond,
  IconEyeOff,
  IconFlag,
  IconSearch,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import type { MapObjectSummary } from 'shared';
import { objectGroups, type ObjectGroupKey } from './objectGroups';
import { useCollapsedGroups } from './useCollapsedGroups';
import classes from '../ObjectsPanel.module.css';

interface ObjectListProps {
  summaries: MapObjectSummary[];
  selectedId: number | null;
  // Выделить объект и перенести к нему центр камеры.
  onPick: (id: number) => void;
}

// Значок вида в строке: у существа — буква в рамке цвета вида, как на карточке на карте.
function KindMark({ summary }: { summary: MapObjectSummary }) {
  const icon = { size: 14, stroke: 1.75 };
  switch (summary.kind) {
    case 'monster':
    case 'npc':
      return (
        <ThemeIcon
          size={24}
          radius="xl"
          variant="light"
          color={summary.kind === 'monster' ? 'red' : 'teal'}
          aria-hidden
        >
          <Text size="xs" fw={700}>
            {summary.label.trim().charAt(0).toUpperCase() || '?'}
          </Text>
        </ThemeIcon>
      );
    case 'start':
      return (
        <ThemeIcon
          size={24}
          radius="xl"
          variant="light"
          color="yellow"
          aria-hidden
        >
          <IconFlag {...icon} />
        </ThemeIcon>
      );
    case 'container':
      return (
        <ThemeIcon size={24} variant="light" color="orange" aria-hidden>
          <IconBox {...icon} />
        </ThemeIcon>
      );
    case 'furniture':
      return (
        <ThemeIcon size={24} variant="light" color="gray" aria-hidden>
          <IconArmchair {...icon} />
        </ThemeIcon>
      );
    case 'item':
      return (
        <ThemeIcon size={24} variant="light" color="yellow" aria-hidden>
          <IconDiamond {...icon} />
        </ThemeIcon>
      );
  }
}

function ObjectRow({
  summary,
  selected,
  onPick,
}: {
  summary: MapObjectSummary;
  selected: boolean;
  onPick: () => void;
}) {
  return (
    <UnstyledButton
      className={classes.row}
      data-selected={selected || undefined}
      aria-pressed={selected}
      onClick={onPick}
    >
      <Group gap={8} wrap="nowrap">
        <KindMark summary={summary} />
        <Text size="sm" flex={1} miw={0} truncate title={summary.label}>
          {summary.label}
        </Text>
        {summary.hidden && (
          <IconEyeOff
            size={14}
            stroke={1.75}
            className={classes.hiddenMark}
            role="img"
            aria-label="скрыт от игроков"
          />
        )}
        <Text size="xs" c="dimmed">
          №{summary.id}
        </Text>
      </Group>
      {summary.warnings.length > 0 && (
        <Text size="xs" c="orange" lineClamp={1} pl={32}>
          {summary.warnings.join(', ')}
        </Text>
      )}
    </UnstyledButton>
  );
}

// Список «На карте» (вариант А артборда «Н3», 2026-10-24, docs/plan/done/scene-page.md, этап 8):
// сворачиваемые группы по видам с числом и поиск по имени или номеру. Клик выделяет
// объект и переносит к нему центр камеры — так находят то, что не видно на сцене.
function ObjectList({ summaries, selectedId, onPick }: ObjectListProps) {
  const [query, setQuery] = useState('');
  const groups = useMemo(
    () => objectGroups(summaries, query),
    [summaries, query],
  );
  const collapsed = useCollapsedGroups();
  // Поиск показывает всё найденное: в свёрнутой группе находку не увидеть.
  const searching = query.trim() !== '';
  const isOpen = (key: ObjectGroupKey) => searching || !collapsed.has(key);
  const allClosed = groups.every((group) => collapsed.has(group.key));

  return (
    <Stack gap={6}>
      <Group justify="space-between">
        <Text size="sm">На карте: {summaries.length}</Text>
        {groups.length > 1 && !searching && (
          <UnstyledButton
            onClick={() =>
              collapsed.setAll(allClosed ? [] : groups.map((g) => g.key))
            }
          >
            <Text size="xs" c="dimmed">
              {allClosed ? 'Развернуть всё' : 'Свернуть всё'}
            </Text>
          </UnstyledButton>
        )}
      </Group>
      {summaries.length === 0 ? (
        <Text size="xs" c="dimmed">
          Объектов пока нет.
        </Text>
      ) : (
        <>
          <TextInput
            size="xs"
            placeholder="Найти по имени или номеру"
            aria-label="Найти на карте"
            leftSection={<IconSearch size={14} />}
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            rightSection={
              searching && (
                <CloseButton
                  size="sm"
                  aria-label="Очистить поиск"
                  onClick={() => setQuery('')}
                />
              )
            }
          />
          {groups.length === 0 && (
            <Text size="xs" c="dimmed">
              Ничего не нашлось.
            </Text>
          )}
          {/* Своя прокрутка, а не ScrollArea: её содержимое растягивается по самой длинной
              строке, и длинное имя уводило список вбок (2026-10-24). */}
          <div className={classes.list}>
            <Stack gap={2}>
              {groups.map((group) => {
                const open = isOpen(group.key);
                return (
                  <Stack key={group.key} gap={2}>
                    <UnstyledButton
                      className={classes.groupHeader}
                      aria-expanded={open}
                      disabled={searching}
                      onClick={() => collapsed.toggle(group.key)}
                    >
                      {open ? (
                        <IconChevronDown size={12} />
                      ) : (
                        <IconChevronRight size={12} />
                      )}
                      <span className={classes.groupTitle}>{group.title}</span>
                      <span>{group.rows.length}</span>
                    </UnstyledButton>
                    {open &&
                      group.rows.map((summary) => (
                        <ObjectRow
                          key={summary.id}
                          summary={summary}
                          selected={summary.id === selectedId}
                          onPick={() => onPick(summary.id)}
                        />
                      ))}
                  </Stack>
                );
              })}
            </Stack>
          </div>
        </>
      )}
    </Stack>
  );
}

export default ObjectList;
