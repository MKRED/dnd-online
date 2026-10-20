import { ActionIcon, Button, Group, Menu } from '@mantine/core';
import {
  IconDots,
  IconNotebook,
  IconPlayerPlay,
  IconPlayerStop,
} from '@tabler/icons-react';

interface MasterActionsProps {
  sessionActive: boolean;
  busy: boolean;
  onStartSession: () => void;
  onEndSession: () => void;
  onOpenJournal: () => void;
  onDelete: () => void;
}

// Действия мастера в лобби. Встреча — главное действие, поэтому первая и заметная;
// «Удалить игру» спрятано в меню, чтобы не стоять рядом с частыми кнопками.
function MasterActions({
  sessionActive,
  busy,
  onStartSession,
  onEndSession,
  onOpenJournal,
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

export default MasterActions;
