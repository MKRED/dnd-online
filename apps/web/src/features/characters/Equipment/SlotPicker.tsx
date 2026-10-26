import { Box, Button, Group, Stack, Text, UnstyledButton } from '@mantine/core';
import {
  ATTUNEMENT_MAX,
  combatEquipProblem,
  equipCost,
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
import AttuneLine from './AttuneLine';
import type { EquipmentPlay } from './equipmentApi';
import classes from './Equipment.module.css';

type WithItem = InventoryEntry & { item: InventoryItemCard };

interface SlotPickerProps {
  slot: EquipSlot;
  inventory: InventoryEntry[];
  busy: boolean;
  onEquip: (entry: WithItem) => void;
  onUnequip: () => void;
  onAttune: (entry: WithItem, attuned: boolean) => void;
  // Во время встречи: цена смены по книге и запрет боя (этап 4).
  play?: EquipmentPlay;
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
  play,
}: SlotPickerProps) {
  const worn = wornBySlot(inventory);
  const current = worn.get(slot) ?? null;
  const candidates = candidatesFor(inventory, slot);
  const full = attunedCount(inventory) >= ATTUNEMENT_MAX;
  const mode = play?.combat ? 'tactical' : 'free';
  // Доспех на месте держит его в бою: ни снять, ни заменить другой вещью.
  const stuck = combatEquipProblem(mode, current?.item.equip ?? null);
  const blocked = (entry: WithItem) =>
    stuck ?? combatEquipProblem(mode, entry.item.equip);

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
              disabled={Boolean(stuck)}
              onClick={onUnequip}
            >
              Снять
            </Button>
          </Group>
          {play && (stuck || equipCost(current.item.equip)) && (
            <Text size="xs" c={stuck ? 'orange' : 'dimmed'}>
              {stuck ?? equipCost(current.item.equip)}
            </Text>
          )}
          {current.item.equip?.attunement && (
            <Group>
              <AttuneLine
                entry={current}
                full={full}
                busy={busy}
                combat={Boolean(play?.combat)}
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
            {candidates.map((entry) => {
              const problem = blocked(entry);
              const off = busy || Boolean(problem);
              return (
                <UnstyledButton
                  key={entry.id}
                  role="listitem"
                  // Не disabled: иначе фокус уходит из списка и Escape его не закрывает.
                  aria-disabled={off}
                  onClick={() => !off && onEquip(entry)}
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
                      {play && (problem || equipCost(entry.item.equip)) && (
                        <Text size="xs" c={problem ? 'orange' : 'dimmed'}>
                          {problem ?? equipCost(entry.item.equip)}
                        </Text>
                      )}
                    </Box>
                  </Group>
                </UnstyledButton>
              );
            })}
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

export default SlotPicker;
