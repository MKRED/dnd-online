import { Button, Text } from '@mantine/core';
import {
  ATTUNEMENT_MAX,
  EQUIP_COMBAT_ATTUNE,
  type InventoryEntry,
  type InventoryItemCard,
} from 'shared';

type WithItem = InventoryEntry & { item: InventoryItemCard };

interface AttuneLineProps {
  entry: WithItem;
  full: boolean;
  busy: boolean;
  // В бою настройку не сменить ни в какую сторону (короткий отдых).
  combat: boolean;
  onAttune: (entry: WithItem, attuned: boolean) => void;
}

// Настройка надетой вещи: по книге это короткий отдых с вещью, поэтому она отдельно от
// надевания.
function AttuneLine({ entry, full, busy, combat, onAttune }: AttuneLineProps) {
  if (combat) {
    return (
      <Text size="xs" c="dimmed">
        {entry.attuned ? 'Настроен. ' : 'Требует настройки. '}
        {EQUIP_COMBAT_ATTUNE}
      </Text>
    );
  }
  if (entry.attuned) {
    return (
      <Button
        size="compact-xs"
        variant="subtle"
        color="grape"
        disabled={busy}
        onClick={() => onAttune(entry, false)}
      >
        Снять настройку
      </Button>
    );
  }
  return full ? (
    <Text size="xs" c="dimmed">
      Требует настройки. Настроено уже {ATTUNEMENT_MAX} из {ATTUNEMENT_MAX}:
      сначала снимите настройку с другого
    </Text>
  ) : (
    <Button
      size="compact-xs"
      variant="light"
      color="grape"
      disabled={busy}
      onClick={() => onAttune(entry, true)}
    >
      Настроиться
    </Button>
  );
}

export default AttuneLine;
