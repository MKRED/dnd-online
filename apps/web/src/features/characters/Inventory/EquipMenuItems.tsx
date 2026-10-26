import { Menu } from '@mantine/core';
import type { InventoryEntry } from 'shared';
import {
  blockedBy,
  SLOT_FULL_NAMES,
  wornBySlot,
} from '../Equipment/equipmentView';
import type { EquipHandlers } from './equipHandlers';

interface EquipMenuItemsProps extends EquipHandlers {
  entry: InventoryEntry;
  inventory: InventoryEntry[];
}

// Кукла из меню строки инвентаря (вариант А макета): надеть на каждое подходящее место,
// снять и настройка. Вторая рука при двуручном в основной не предлагается.
function EquipMenuItems({
  entry,
  inventory,
  onEquip,
  onUnequip,
  onAttune,
}: EquipMenuItemsProps) {
  const equip = entry.item && !entry.inactive ? entry.item.equip : null;
  if (!equip) return null;
  const worn = wornBySlot(inventory);
  const carried = entry.location === 'carried';
  const free = entry.quantity === 1 || entry.equipped.length < entry.quantity;
  const places = carried
    ? equip.slots.filter(
        (slot) => !entry.equipped.includes(slot) && !blockedBy(worn, slot),
      )
    : [];

  const attune = equip.attunement && (entry.attuned || carried);
  if (
    (!free || places.length === 0) &&
    entry.equipped.length === 0 &&
    !attune
  ) {
    return null;
  }
  // Надеть — частое действие: оно сверху меню, «Убрать из инвентаря» — внизу.
  return (
    <>
      {free &&
        places.map((slot) => {
          const other = worn.get(slot);
          return (
            <Menu.Item key={slot} onClick={() => onEquip(entry, slot)}>
              {other
                ? `Надеть вместо «${other.item.name}»: ${SLOT_FULL_NAMES[slot]}`
                : `Надеть: ${SLOT_FULL_NAMES[slot]}`}
            </Menu.Item>
          );
        })}
      {entry.equipped.map((slot) => (
        <Menu.Item key={slot} onClick={() => onUnequip(entry, slot)}>
          Снять: {SLOT_FULL_NAMES[slot]}
        </Menu.Item>
      ))}
      {equip.attunement &&
        (entry.attuned ? (
          <Menu.Item color="grape" onClick={() => onAttune(entry, false)}>
            Снять настройку
          </Menu.Item>
        ) : (
          carried && (
            <Menu.Item color="grape" onClick={() => onAttune(entry, true)}>
              Настроиться
            </Menu.Item>
          )
        ))}
      <Menu.Divider />
    </>
  );
}

export default EquipMenuItems;
