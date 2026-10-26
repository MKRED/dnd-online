import type { EquipSlot, EquipStats } from './equipment.js';
import type {
  ArmorItemDetails,
  ShieldItemDetails,
  WeaponItemDetails,
} from './itemEquipment.js';
import type { InventoryEntry } from './inventory.js';

// Что надето на кукле и даёт числа листа (docs/plan/equipment.md, этап 3). Сервер уже
// отдаёт места только живых строк (equipment-read.ts): скрытый, удалённый или
// переделанный автором предмет мест не занимает.

export interface Worn<T> {
  name: string;
  details: T;
}
export interface WornWeapon extends Worn<WeaponItemDetails> {
  slot: EquipSlot;
}

export interface WornGear {
  armor: Worn<ArmorItemDetails> | null;
  shield: Worn<ShieldItemDetails> | null;
  // В порядке мест куклы: ближний бой, потом дальний; основная рука, потом вторая.
  weapons: WornWeapon[];
}

type Entry = Pick<InventoryEntry, 'equipped' | 'item'>;

export function wornGear(inventory: readonly Entry[]): WornGear {
  const placed: { slot: EquipSlot; name: string; stats: EquipStats }[] = [];
  for (const entry of inventory) {
    const stats = entry.item?.equip?.stats;
    if (!entry.item || !stats) continue;
    for (const slot of entry.equipped) {
      placed.push({ slot, name: entry.item.name, stats });
    }
  }
  const gear: WornGear = { armor: null, shield: null, weapons: [] };
  for (const slot of WEAPON_SLOTS) {
    for (const { slot: at, name, stats } of placed) {
      if (at !== slot) continue;
      if (stats.category === 'weapon') {
        gear.weapons.push({ slot, name, details: stats.details });
      }
      if (stats.category === 'shield') {
        gear.shield = { name, details: stats.details };
      }
    }
  }
  const body = placed.find((p) => p.slot === 'body');
  if (body?.stats.category === 'armor') {
    gear.armor = { name: body.name, details: body.stats.details };
  }
  return gear;
}

const WEAPON_SLOTS: readonly EquipSlot[] = [
  'meleeMain',
  'meleeOff',
  'rangedMain',
  'rangedOff',
];
