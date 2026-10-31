import { ActionIcon, Anchor, Group, Title, Tooltip } from '@mantine/core';
import { IconPencil } from '@tabler/icons-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapNameForm } from '../../features/maps';

interface MapTitleProps {
  name: string;
  // Переименовать карту; null — карта ещё не загружена.
  onRename: ((name: string) => Promise<void>) | null;
}

// Название карты в правой панели: ✎ или двойной щелчок открывают поле на его месте.
function MapTitle({ name, onRename }: MapTitleProps) {
  const [editing, setEditing] = useState(false);
  if (editing && onRename) {
    return (
      <MapNameForm
        initial={name}
        onSave={onRename}
        onClose={() => setEditing(false)}
      />
    );
  }
  return (
    <Group justify="space-between" align="baseline" wrap="nowrap">
      <Group gap={4} align="baseline" wrap="nowrap" style={{ minWidth: 0 }}>
        <Title
          order={3}
          onDoubleClick={onRename ? () => setEditing(true) : undefined}
          style={{ overflowWrap: 'anywhere' }}
        >
          {name}
        </Title>
        {onRename && (
          <Tooltip label="Переименовать карту" withArrow>
            <ActionIcon
              variant="subtle"
              color="gray"
              aria-label="Переименовать карту"
              onClick={() => setEditing(true)}
            >
              <IconPencil size={16} stroke={1.75} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>
      <Anchor component={Link} to="/maps" size="sm" style={{ flexShrink: 0 }}>
        Все карты
      </Anchor>
    </Group>
  );
}

export default MapTitle;
