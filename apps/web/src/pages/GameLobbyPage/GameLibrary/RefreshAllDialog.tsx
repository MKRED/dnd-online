import { Button, Group, List, Modal, Stack, Text } from '@mantine/core';
import type { GameLibraryItem } from 'shared';
import { LIBRARY_KIND_LABELS } from '../../../features/games';

interface RefreshAllDialogProps {
  entries: GameLibraryItem[];
  onConfirm: () => void;
  onClose: () => void;
}

// Подтверждение «Обновить все» со списком: копия перезапишется справочником целиком.
function RefreshAllDialog({
  entries,
  onConfirm,
  onClose,
}: RefreshAllDialogProps) {
  return (
    <Modal
      opened
      onClose={onClose}
      title="Обновить все из справочника?"
      centered
    >
      <Stack gap="md">
        <Text size="sm">
          Копии в игре заменятся текущими записями справочника, правки,
          сделанные только в игре, пропадут. Новые связи докопируются.
        </Text>
        <List size="sm" spacing={2}>
          {entries.map((entry) => (
            <List.Item key={`${entry.kind}:${entry.sourceId}`}>
              {entry.name}{' '}
              <Text span size="sm" c="dimmed">
                · {LIBRARY_KIND_LABELS[entry.kind]}
              </Text>
            </List.Item>
          ))}
        </List>
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={onConfirm} data-autofocus>
            Обновить {entries.length}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export default RefreshAllDialog;
