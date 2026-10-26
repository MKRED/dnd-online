import { Stack, Text } from '@mantine/core';
import type { InventoryEntry } from 'shared';
import type { EquipHandlers } from './equipHandlers';
import InventoryRow from './InventoryRow';

interface InventoryListProps {
  entries: InventoryEntry[];
  editable: boolean;
  // Текст пустого списка; пустая строка — ничего не показывать.
  empty: string;
  busyId: string | null;
  onMove: (entry: InventoryEntry) => void;
  onEditQuantity: (entry: InventoryEntry) => void;
  onRemove: (entry: InventoryEntry) => void;
  inventory: InventoryEntry[];
  equipHandlers: EquipHandlers;
}

function InventoryList({
  entries,
  editable,
  empty,
  busyId,
  onMove,
  onEditQuantity,
  onRemove,
  inventory,
  equipHandlers,
}: InventoryListProps) {
  if (entries.length === 0) {
    return empty ? (
      <Text size="sm" c="dimmed">
        {empty}
      </Text>
    ) : null;
  }
  return (
    <Stack gap="xs">
      {entries.map((entry) => (
        <InventoryRow
          key={entry.id}
          entry={entry}
          editable={editable}
          busy={busyId === entry.id}
          onMove={() => onMove(entry)}
          onEditQuantity={() => onEditQuantity(entry)}
          onRemove={() => onRemove(entry)}
          inventory={inventory}
          equipHandlers={equipHandlers}
        />
      ))}
    </Stack>
  );
}

export default InventoryList;
