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
import type { CharacterAbilityEntry } from 'shared';
import { useAbilityCandidates } from './useAbilityCandidates';

interface AddAbilityDialogProps {
  added: readonly CharacterAbilityEntry[];
  busy: boolean;
  error: string | null;
  onAdd: (abilityId: string) => Promise<boolean>;
  onClose: () => void;
}

// Добавить способность из своих и каталога. Монтируется только на время показа — списки
// грузятся при открытии. После добавления окно остаётся открытым: способности обычно
// вносят пачкой (все заклинания класса), а добавленная тут же становится недоступной.
function AddAbilityDialog({
  added,
  busy,
  error,
  onAdd,
  onClose,
}: AddAbilityDialogProps) {
  const { loaded, options, error: loadError } = useAbilityCandidates(added);
  const [abilityId, setAbilityId] = useState<string | null>(null);
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!abilityId) return;
    const label = options
      .flatMap((group) => group.items)
      .find((item) => item.value === abilityId)?.label;
    if (await onAdd(abilityId)) {
      setLastAdded(label ?? null);
      setAbilityId(null);
    }
  };

  return (
    <Modal opened onClose={onClose} title="Добавить способность">
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
            label="Способность"
            description="Умения и заклинания — свои и из каталога"
            placeholder={
              loaded ? 'Найти по названию' : 'Загружаем способности…'
            }
            data={options}
            value={abilityId}
            onChange={(value) => {
              setAbilityId(value);
              setLastAdded(null);
            }}
            searchable
            selectFirstOptionOnChange
            disabled={!loaded}
            nothingFoundMessage="Ничего не нашлось"
            limit={50}
            data-autofocus
          />
          {lastAdded && !error && (
            <Text size="sm" c="teal" role="status">
              Добавлено: {lastAdded}
            </Text>
          )}
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={onClose}>
              Готово
            </Button>
            <Button type="submit" disabled={!abilityId} loading={busy}>
              Добавить
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

export default AddAbilityDialog;
