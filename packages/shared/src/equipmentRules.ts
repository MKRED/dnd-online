import {
  ATTUNEMENT_MAX,
  EQUIP_SLOTS,
  MAIN_HAND_OF,
  OFF_HAND_OF,
  type EquipSlot,
  type ItemEquip,
} from './equipment.js';
import type { InventoryLocation } from './inventory.js';

// Правила куклы и настройки (docs/dnd/weapons-armor.md, «Кукла»). Чистые функции: сервер
// проверяет ими каждую правку, а лист — что предложить на место.

export const EQUIP_NOT_EQUIPMENT = 'Эту вещь не надеть: она не экипировка';
export const EQUIP_NOT_CARRIED = 'Надеть можно только вещь «При себе»';
export const EQUIP_WRONG_SLOT = 'Эта вещь не подходит на это место';
export const EQUIP_HANDS_BUSY = 'Вторая рука занята двуручным оружием';
export const equipAllWorn = (quantity: number) =>
  `Все ${quantity} шт. уже надеты: снимите одну с другого места`;
export const ATTUNE_NOT_NEEDED = 'Этот предмет не требует настройки';
export const ATTUNE_NOT_CARRIED = 'Настроиться можно только на вещь «При себе»';
export const ATTUNE_COPY =
  'Персонаж уже настроен на другую копию этого предмета';
export const ATTUNE_FULL = `Персонаж уже настроен на ${ATTUNEMENT_MAX} предмета: сначала снимите настройку с другого`;

// Что надето сейчас. twoHanded — у предмета строки.
export interface WornItem {
  slot: EquipSlot;
  entryId: string;
  twoHanded: boolean;
}

// Строка инвентаря для правил. equip: null — предмет скрыт, удалён или не экипировка.
export interface EquipCandidate {
  id: string;
  location: InventoryLocation;
  quantity: number;
  equip: ItemEquip | null;
}

// freed — места, которые освобождаются, кроме самого места: двуручное снимает вторую руку,
// единственный предмет переезжает со старого места.
export type EquipPlan = { error: string } | { freed: EquipSlot[] };

export function planEquip(
  worn: readonly WornItem[],
  entry: EquipCandidate,
  slot: EquipSlot,
): EquipPlan {
  const { equip } = entry;
  if (!equip) return { error: EQUIP_NOT_EQUIPMENT };
  if (entry.location !== 'carried') return { error: EQUIP_NOT_CARRIED };
  if (!equip.slots.includes(slot)) return { error: EQUIP_WRONG_SLOT };
  const at = (s: EquipSlot | undefined) => worn.find((w) => w.slot === s);

  if (at(MAIN_HAND_OF[slot])?.twoHanded) return { error: EQUIP_HANDS_BUSY };
  const freed: EquipSlot[] = [];
  const off = OFF_HAND_OF[slot];
  if (equip.twoHanded && off && at(off)) freed.push(off);

  // Одна вещь — одно место: стопка из двух кинжалов держится в обеих руках, а
  // единственный кинжал переезжает в новую руку.
  const elsewhere = worn.filter(
    (w) => w.entryId === entry.id && w.slot !== slot && !freed.includes(w.slot),
  );
  if (elsewhere.length >= entry.quantity) {
    if (entry.quantity > 1) return { error: equipAllWorn(entry.quantity) };
    freed.push(elsewhere[0].slot);
  }
  return { freed };
}

// Строка для правил настройки: itemId — чтобы не настроиться на две копии одного предмета.
export interface AttuneCandidate extends EquipCandidate {
  itemId: string | null;
  attuned: boolean;
}

// Настроиться на предмет строки. Сама настройка по книге — короткий отдых в касании с
// предметом; приложение время не ведёт, это переключатель (docs/dnd/weapons-armor.md).
export function attuneProblem(
  entries: readonly AttuneCandidate[],
  entry: AttuneCandidate,
): string | null {
  if (!entry.equip?.attunement) return ATTUNE_NOT_NEEDED;
  if (entry.location !== 'carried') return ATTUNE_NOT_CARRIED;
  const others = entries.filter((e) => e.attuned && e.id !== entry.id);
  if (others.some((e) => e.itemId === entry.itemId)) return ATTUNE_COPY;
  if (others.length >= ATTUNEMENT_MAX) return ATTUNE_FULL;
  return null;
}

// Строка инвентаря после правки: что с её местами на кукле.
export interface WornEntryState {
  id: string;
  location: InventoryLocation;
  quantity: number;
}

// Места, которые пора снять после правки инвентаря: вещь ушла в хранилище или её стало
// меньше, чем мест. Лишние снимаются с конца списка мест.
export function slotsToPrune(
  worn: readonly Pick<WornItem, 'slot' | 'entryId'>[],
  entries: readonly WornEntryState[],
): EquipSlot[] {
  const result: EquipSlot[] = [];
  const byEntry = new Map(entries.map((e) => [e.id, e]));
  const sorted = [...worn].sort(
    (a, b) => EQUIP_SLOTS.indexOf(a.slot) - EQUIP_SLOTS.indexOf(b.slot),
  );
  const used = new Map<string, number>();
  for (const w of sorted) {
    const entry = byEntry.get(w.entryId);
    const count = (used.get(w.entryId) ?? 0) + 1;
    used.set(w.entryId, count);
    if (!entry || entry.location !== 'carried' || count > entry.quantity) {
      result.push(w.slot);
    }
  }
  return result;
}
