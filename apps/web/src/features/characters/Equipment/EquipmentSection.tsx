import { Alert, Badge, Fieldset, Group, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import type {
  Character,
  EquipSlot,
  InventoryEntry,
  InventoryItemCard,
} from 'shared';
import { SheetModel } from '../CharacterModel';
import { useInventoryEditor } from '../Inventory/useInventoryEditor';
import { equipEntry, setAttunement, unequipSlot } from './equipmentApi';
import {
  anythingWorn,
  attunementLine,
  holdsTwoHanded,
  LEFT_SLOTS,
  RIGHT_SLOTS,
  SLOT_FULL_NAMES,
  SLOT_LABELS,
  WEAPON_SETS,
  wornBySlot,
} from './equipmentView';
import Silhouette from './Silhouette';
import SlotButton from './SlotButton';
import SlotControl from './SlotControl';
import SlotPicker from './SlotPicker';
import classes from './Equipment.module.css';

type WithItem = InventoryEntry & { item: InventoryItemCard };

interface EquipmentSectionProps {
  character: Character;
  // Есть — автор надевает и снимает; нет — кукла только показывает надетое.
  onChange?: (inventory: InventoryEntry[]) => void;
  // false — без 3D-модели в центре (окно карточки на сцене игры): там силуэт.
  model?: boolean;
}

const BUSY = 'equipment';

// Кукла на листе (docs/plan/equipment.md, этап 2, вариант А): места вокруг 3D-модели
// персонажа или силуэта, нажатие на место — список подходящих вещей «При себе».
function EquipmentSection({
  character,
  onChange,
  model = true,
}: EquipmentSectionProps) {
  const { id, inventory } = character;
  const editable = Boolean(onChange);
  const [open, setOpen] = useState<EquipSlot | null>(null);
  const { busyId, error, setError, run } = useInventoryEditor((next) =>
    onChange?.(next),
  );
  const busy = busyId === BUSY;

  if (!editable && !anythingWorn(inventory)) return null;
  const worn = wornBySlot(inventory);

  // Надеть и снять закрывают список: дело сделано. Настройка его оставляет — рядом
  // кнопка «Снять».
  const equip = async (slot: EquipSlot, entry: WithItem) => {
    const done = await run(
      BUSY,
      () => equipEntry(id, slot, entry.id),
      'Не удалось надеть вещь',
    );
    if (done) setOpen(null);
  };
  const unequip = async (slot: EquipSlot) => {
    const done = await run(
      BUSY,
      () => unequipSlot(id, slot),
      'Не удалось снять вещь',
    );
    if (done) setOpen(null);
  };
  const attune = (entry: WithItem, attuned: boolean) =>
    void run(
      BUSY,
      () => setAttunement(id, entry.id, attuned),
      attuned ? 'Не удалось настроиться' : 'Не удалось снять настройку',
    );

  const slot = (place: EquipSlot, label = SLOT_LABELS[place], wide = false) => {
    const button = { label, entry: worn.get(place) ?? null, editable, wide };
    if (!editable) return <SlotButton key={place} {...button} />;
    const title = SLOT_FULL_NAMES[place];
    return (
      <SlotControl
        key={place}
        button={button}
        title={`${title[0].toUpperCase()}${title.slice(1)} · что надеть`}
        opened={open === place}
        onOpen={() => {
          setError(null);
          setOpen(place);
        }}
        onClose={() => setOpen(null)}
      >
        <SlotPicker
          slot={place}
          inventory={inventory}
          busy={busy}
          onEquip={(entry) => void equip(place, entry)}
          onUnequip={() => void unequip(place)}
          onAttune={attune}
        />
      </SlotControl>
    );
  };

  return (
    <Fieldset legend="Экипировка">
      <Stack gap="sm">
        <Group gap="sm">
          <Badge color="grape" variant="light">
            {attunementLine(inventory)}
          </Badge>
          {editable && (
            <Text size="xs" c="dimmed">
              Нажмите на место, чтобы надеть или снять
            </Text>
          )}
        </Group>
        {error && (
          <Alert
            color="red"
            variant="light"
            p="xs"
            withCloseButton
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}
        <div className={classes.doll}>
          <div className={classes.layout}>
            <div className={`${classes.left} ${classes.column}`}>
              {LEFT_SLOTS.map((place) => slot(place))}
            </div>
            <div className={classes.center}>
              {model ? (
                <SheetModel
                  characterId={id}
                  size={220}
                  fallback={<Silhouette />}
                />
              ) : (
                <Silhouette />
              )}
            </div>
            <div className={`${classes.weapons} ${classes.column}`}>
              {WEAPON_SETS.map((set) => (
                <Stack key={set.main} gap={4}>
                  <Text size="xs" fw={700} c="dimmed">
                    {set.label}
                  </Text>
                  <div className={classes.pair}>
                    {/* Двуручное занимает обе руки: одно широкое место вместо двух. */}
                    {holdsTwoHanded(worn, set.main)
                      ? slot(set.main, 'Обе руки · двуручное', true)
                      : [slot(set.main), slot(set.off)]}
                  </div>
                </Stack>
              ))}
            </div>
            <div className={`${classes.right} ${classes.column}`}>
              {RIGHT_SLOTS.map((place) => slot(place))}
            </div>
          </div>
        </div>
      </Stack>
    </Fieldset>
  );
}

export default EquipmentSection;
