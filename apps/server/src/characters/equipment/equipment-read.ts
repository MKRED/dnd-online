import { inArray } from 'drizzle-orm';
import { EQUIP_SLOTS, type EquipSlot, type ItemLink } from 'shared';
import type {
  DatabaseService,
  DbTransaction,
} from '../../database/database.service.js';
import { characterEquipment } from '../../database/schema/index.js';

type Db = DatabaseService['db'] | DbTransaction;

// Надетое по строкам инвентаря, места в порядке EQUIP_SLOTS.
export async function loadEquipped(
  db: Db,
  characterIds: readonly string[],
): Promise<Map<string, EquipSlot[]>> {
  const rows = await db
    .select()
    .from(characterEquipment)
    .where(inArray(characterEquipment.characterId, [...characterIds]));
  const result = new Map<string, EquipSlot[]>();
  for (const row of rows.sort(bySlot)) {
    const list = result.get(row.entryId) ?? [];
    list.push(row.slot);
    result.set(row.entryId, list);
  }
  return result;
}

const bySlot = (a: { slot: EquipSlot }, b: { slot: EquipSlot }) =>
  EQUIP_SLOTS.indexOf(a.slot) - EQUIP_SLOTS.indexOf(b.slot);

// Надетое и настройка строки, какими они действуют сейчас. Автор мог поменять предмет
// после того, как его надели (сделать двуручным, сменить категорию, убрать настройку) или
// скрыть его: такие места пусты и настройки нет, пока владелец не переоденет персонажа, —
// строки базы не трогаем.
export function liveEquipment(
  link: ItemLink,
  equipped: readonly EquipSlot[],
  attuned: boolean,
): { equipped: EquipSlot[]; attuned: boolean } {
  if (!link.item || link.inactive || !link.item.equip) {
    return { equipped: [], attuned: false };
  }
  const { slots, attunement } = link.item.equip;
  return {
    equipped: equipped.filter((slot) => slots.includes(slot)),
    attuned: attuned && attunement,
  };
}
