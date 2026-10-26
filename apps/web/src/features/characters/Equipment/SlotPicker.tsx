import { Box, Button, Group, Stack, Text, UnstyledButton } from '@mantine/core';
import {
  ATTUNEMENT_MAX,
  type EquipSlot,
  type InventoryEntry,
  type InventoryItemCard,
} from 'shared';
import ItemThumb from '../../items/ItemThumb';
import { RARITY_LABELS } from '../../items/itemLabels';
import {
  attunedCount,
  candidatesFor,
  displaces,
  SLOT_FULL_NAMES,
  wornBySlot,
} from './equipmentView';
import classes from './Equipment.module.css';

type WithItem = InventoryEntry & { item: InventoryItemCard };

interface SlotPickerProps {
  slot: EquipSlot;
  inventory: InventoryEntry[];
  busy: boolean;
  onEquip: (entry: WithItem) => void;
  onUnequip: () => void;
  onAttune: (entry: WithItem, attuned: boolean) => void;
}

// Что надеть на место: надетая вещь со «Снять» и настройкой, под ней — подходящие вещи
// «При себе». Настройка — отдельно от надевания: по книге это короткий отдых с вещью.
function SlotPicker({
  slot,
  inventory,
  busy,
  onEquip,
  onUnequip,
  onAttune,
}: SlotPickerProps) {
  const worn = wornBySlot(inventory);
  const current = worn.get(slot) ?? null;
  const candidates = candidatesFor(inventory, slot);
  const full = attunedCount(inventory) >= ATTUNEMENT_MAX;

  return (
    <Stack gap="xs">
      {current && (
        <Stack gap={6}>
          <Group gap="xs" wrap="nowrap">
            <Box className={classes.thumb}>
              <ItemThumb item={current.item} placeholderSize="1rem" />
            </Box>
            <Text size="sm" fw={600} style={{ flex: 1, minWidth: 0 }} truncate>
              {current.item.name}
            </Text>
            <Button
              size="compact-sm"
              variant="default"
              loading={busy}
              onClick={onUnequip}
            >
              Снять
            </Button>
          </Group>
          {current.item.equip?.attunement && (
            <Group>
              <AttuneLine
                entry={current}
                full={full}
                busy={busy}
                onAttune={onAttune}
              />
            </Group>
          )}
        </Stack>
      )}
      {candidates.length === 0 ? (
        <Text size="sm" c="dimmed">
          {current
            ? 'Других вещей для этого места при себе нет'
            : 'При себе нет вещей для этого места'}
        </Text>
      ) : (
        <>
          <Text size="xs" c="dimmed">
            {current ? 'Надеть вместо неё' : 'При себе, подходит на это место'}
          </Text>
          <Stack gap={2} role="list">
            {candidates.map((entry) => (
              <UnstyledButton
                key={entry.id}
                role="listitem"
                // Не disabled: иначе фокус уходит из списка и Escape его не закрывает.
                aria-disabled={busy}
                onClick={() => !busy && onEquip(entry)}
                p={6}
                style={{ borderRadius: 'var(--mantine-radius-sm)' }}
                className={classes.option}
              >
                <Group gap="xs" wrap="nowrap">
                  <Box className={classes.thumb}>
                    <ItemThumb item={entry.item} placeholderSize="1rem" />
                  </Box>
                  <Box style={{ minWidth: 0 }}>
                    <Text size="sm" fw={600} truncate>
                      {entry.item.name}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {candidateNote(entry, displaces(worn, entry, slot))}
                    </Text>
                  </Box>
                </Group>
              </UnstyledButton>
            ))}
          </Stack>
        </>
      )}
    </Stack>
  );
}

// Под названием вещи — то, что важно до нажатия: редкость, настройка, откуда она
// переедет и что снимет.
function candidateNote(entry: WithItem, displaced: WithItem | null): string {
  const parts = [RARITY_LABELS[entry.item.rarity]];
  if (entry.item.equip?.attunement) {
    parts.push(entry.attuned ? 'настроен' : 'требует настройки');
  }
  if (entry.equipped.length >= entry.quantity) {
    parts.push(`переедет: ${SLOT_FULL_NAMES[entry.equipped[0]]}`);
  }
  if (displaced) parts.push(`снимет «${displaced.item.name}»`);
  return parts.join(' · ');
}

interface AttuneLineProps {
  entry: WithItem;
  full: boolean;
  busy: boolean;
  onAttune: (entry: WithItem, attuned: boolean) => void;
}

function AttuneLine({ entry, full, busy, onAttune }: AttuneLineProps) {
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

export default SlotPicker;
