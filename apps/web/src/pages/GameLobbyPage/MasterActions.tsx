import {
  ActionIcon,
  Button,
  Group,
  Indicator,
  Menu,
  Tooltip,
} from '@mantine/core';
import {
  IconBooks,
  IconDots,
  IconNotebook,
  IconPlayerPlay,
  IconPlayerStop,
} from '@tabler/icons-react';
import { pluralRu } from 'shared';

interface MasterActionsProps {
  sessionActive: boolean;
  busy: boolean;
  // Сколько копий библиотеки изменены в справочнике и ждут обновления.
  libraryUpdates: number;
  onStartSession: () => void;
  onEndSession: () => void;
  onOpenJournal: () => void;
  onOpenLibrary: () => void;
  onDelete: () => void;
}

// Действия мастера в лобби. Встреча — главное действие, поэтому первая и заметная;
// «Удалить игру» спрятано в меню, чтобы не стоять рядом с частыми кнопками.
function MasterActions({
  sessionActive,
  busy,
  libraryUpdates,
  onStartSession,
  onEndSession,
  onOpenJournal,
  onOpenLibrary,
  onDelete,
}: MasterActionsProps) {
  return (
    <Group gap="xs">
      {sessionActive ? (
        <Button
          variant="light"
          color="red"
          leftSection={<IconPlayerStop size={16} />}
          disabled={busy}
          onClick={onEndSession}
        >
          Закончить встречу
        </Button>
      ) : (
        <Button
          leftSection={<IconPlayerPlay size={16} />}
          disabled={busy}
          onClick={onStartSession}
        >
          Начать встречу
        </Button>
      )}
      <Button
        variant="default"
        leftSection={<IconNotebook size={16} />}
        onClick={onOpenJournal}
      >
        Журнал
      </Button>
      {/* Кружок в углу, как счётчик непрочитанного: кнопка не шире, ряд не перестраивается. */}
      <Tooltip
        label={libraryUpdatesHint(libraryUpdates)}
        disabled={libraryUpdates === 0}
        multiline
        w={260}
      >
        <Indicator
          label={libraryUpdates}
          disabled={libraryUpdates === 0}
          maxValue={99}
          size={18}
          color="yellow.7"
          autoContrast
          withBorder
        >
          <Button
            variant="default"
            leftSection={<IconBooks size={16} />}
            aria-label={
              libraryUpdates > 0
                ? `Библиотека, ждут обновления: ${libraryUpdates}`
                : undefined
            }
            onClick={onOpenLibrary}
          >
            Библиотека
          </Button>
        </Indicator>
      </Tooltip>
      <Menu position="bottom-end">
        <Menu.Target>
          <ActionIcon
            variant="default"
            size="lg"
            aria-label="Ещё действия"
            disabled={busy}
          >
            <IconDots size={16} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item color="red" onClick={onDelete}>
            Удалить игру
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Group>
  );
}

function libraryUpdatesHint(count: number) {
  const records = pluralRu(count, ['запись', 'записи', 'записей']);
  const changed = pluralRu(count, ['изменена', 'изменены', 'изменены']);
  return `${count} ${records} ${changed} в справочнике: откройте библиотеку, чтобы обновить`;
}

export default MasterActions;
