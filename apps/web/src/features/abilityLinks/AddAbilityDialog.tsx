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
import PerDaySelect from './PerDaySelect';
import type { AbilityLinkEntry } from './abilityLinkView';
import {
  useAbilityCandidates,
  type AbilityOwnerKind,
} from './useAbilityCandidates';

interface AddAbilityDialogProps {
  added: readonly AbilityLinkEntry[];
  owner: AbilityOwnerKind;
  busy: boolean;
  error: string | null;
  // perDay — «N/день» заклинания монстра; у остального всегда null.
  onAdd: (abilityId: string, perDay: number | null) => Promise<boolean>;
  onClose: () => void;
}

const DESCRIPTIONS: Record<AbilityOwnerKind, string> = {
  character: 'Умения и заклинания — свои и из каталога',
  monster: 'Способности монстров, умения и заклинания — свои и из каталога',
};

// Добавить способность из своих и каталога. Монтируется только на время показа — списки
// грузятся при открытии. После добавления окно остаётся открытым: способности обычно
// вносят пачкой (все заклинания класса), а добавленная тут же становится недоступной.
function AddAbilityDialog({
  added,
  owner,
  busy,
  error,
  onAdd,
  onClose,
}: AddAbilityDialogProps) {
  const {
    loaded,
    options,
    categoryOf,
    error: loadError,
  } = useAbilityCandidates(added, owner);
  const [abilityId, setAbilityId] = useState<string | null>(null);
  const [perDay, setPerDay] = useState<number | null>(null);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  // Частоту задают только заклинанию монстра (docs/plan/monsters-npcs.md).
  const withPerDay =
    owner === 'monster' &&
    abilityId !== null &&
    categoryOf(abilityId) === 'spell';

  const handleSubmit = async () => {
    if (!abilityId) return;
    const label = options
      .flatMap((group) => group.items)
      .find((item) => item.value === abilityId)?.label;
    if (await onAdd(abilityId, withPerDay ? perDay : null)) {
      setLastAdded(label ?? null);
      setAbilityId(null);
      setPerDay(null);
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
            description={DESCRIPTIONS[owner]}
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
          {withPerDay && (
            <PerDaySelect
              label="В день"
              description="Как часто монстр накладывает это заклинание"
              value={perDay}
              onChange={setPerDay}
            />
          )}
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
