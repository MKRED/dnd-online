import {
  Alert,
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Text,
} from '@mantine/core';
import { useState } from 'react';
import { formatEffectDuration } from 'shared';
import type { EffectLinkEntry } from './effectsApi';
import { useEffectCandidates } from './useEffectCandidates';

interface AddEffectDialogProps {
  applied: readonly EffectLinkEntry[];
  busy: boolean;
  error: string | null;
  onApply: (effectId: string) => Promise<boolean>;
  onClose: () => void;
}

// Наложить эффект из своих и каталога. Монтируется только на время показа — списки
// эффектов грузятся при открытии. После наложения окно закрывается: эффекты обычно
// накладывают по одному, по ходу игры.
function AddEffectDialog({
  applied,
  busy,
  error,
  onApply,
  onClose,
}: AddEffectDialogProps) {
  const {
    loaded,
    options,
    byId,
    error: loadError,
  } = useEffectCandidates(applied);
  const [effectId, setEffectId] = useState<string | null>(null);
  const picked = effectId ? byId.get(effectId) : undefined;

  const handleSubmit = async () => {
    if (effectId && (await onApply(effectId))) onClose();
  };

  return (
    <Modal opened onClose={onClose} title="Наложить эффект">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <Stack gap="md">
          {(loadError ?? error) && (
            <Alert color="red" variant="light" p="xs">
              {loadError ?? error}
            </Alert>
          )}
          <Select
            label="Эффект"
            placeholder={loaded ? 'Найти по названию' : 'Загружаем эффекты…'}
            data={options}
            value={effectId}
            onChange={setEffectId}
            searchable
            selectFirstOptionOnChange
            disabled={!loaded}
            nothingFoundMessage="Ничего не нашлось"
            limit={50}
            data-autofocus
          />
          {picked && (
            <Text size="sm" c="dimmed">
              Длительность: {formatEffectDuration(picked.duration)}. Снимается
              вручную — крестиком на плашке.
            </Text>
          )}
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={!effectId} loading={busy}>
              Наложить
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

export default AddEffectDialog;
