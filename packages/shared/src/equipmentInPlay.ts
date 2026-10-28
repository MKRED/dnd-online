import type { EquipSlot, ItemEquip } from './equipment.js';
import type { GameMoveMode } from './game-figures.js';
import type { ArmorKind } from './itemEquipment.js';

// Смена экипировки во время встречи (docs/plan/equipment.md, этап 4; правила —
// docs/dnd/weapons-armor.md, «Экипировка в игре»). Ходов и действий в игре ещё нет, поэтому
// цена смены по книге — только подсказка, а запрещено лишь то, что в бою невозможно
// вообще: доспех надевают и снимают минуты, а настройка требует короткого отдыха.

export const EQUIP_COMBAT_ARMOR =
  'В бою доспех не сменить: его надевают и снимают минуты';
export const EQUIP_COMBAT_ATTUNE =
  'В бою настройку не сменить: нужен короткий отдых';

// Книга, глава Equipment, таблица доспехов: время по категории.
const ARMOR_DON_DOFF: Record<ArmorKind, string> = {
  light: 'Надеть и снять — 1 минута',
  medium: 'Надеть — 5 минут, снять — 1 минута',
  heavy: 'Надеть — 10 минут, снять — 5 минут',
};

// Чего стоит взять или надеть вещь; у одежды и украшений правила нет. Оружие — по домашнему
// правилу, а не по книге: книжная смена при атаке слишком расплывчата (docs/dnd/weapons-armor.md,
// «Смена оружия — домашнее правило»).
export const WEAPON_SWAP_COST =
  'Снять или заменить — раз за ход бесплатно, дальше действие';

export function equipCost(equip: ItemEquip | null): string | null {
  const stats = equip?.stats;
  if (!stats) return null;
  switch (stats.category) {
    case 'weapon':
      return WEAPON_SWAP_COST;
    case 'shield':
      return 'Надеть или снять — действие «Использование»';
    case 'armor':
      return ARMOR_DON_DOFF[stats.details.kind];
  }
}

// Почему эту вещь нельзя надеть или снять сейчас; null — можно.
export function combatEquipProblem(
  mode: GameMoveMode,
  equip: ItemEquip | null,
): string | null {
  return mode === 'tactical' && equip?.stats?.category === 'armor'
    ? EQUIP_COMBAT_ARMOR
    : null;
}

export function combatAttuneProblem(mode: GameMoveMode): string | null {
  return mode === 'tactical' ? EQUIP_COMBAT_ATTUNE : null;
}

// Правка куклы в игре — для журнала: что просили сделать.
export type GameEquipmentChange =
  | { kind: 'equip'; slot: EquipSlot; entryId: string }
  | { kind: 'unequip'; slot: EquipSlot }
  | { kind: 'attune'; entryId: string }
  | { kind: 'end_attunement'; entryId: string };

// Цена смены в руке в бою с очерёдностью (docs/plan/combat.md, «Решения к этапу 5»): оружие
// — по домашнему правилу (первая смена за ход бесплатно, дальше действие), щит — действие
// «Использование» по книге. null — место не в руках или в руках ничего не меняется.
export type HandChangeCost = 'free' | 'action';

const HAND_SLOTS: readonly EquipSlot[] = [
  'meleeMain',
  'meleeOff',
  'rangedMain',
  'rangedOff',
];

export function handChangeCost(
  slot: EquipSlot,
  touched: readonly (ItemEquip | null)[],
  handSwapped: boolean,
): HandChangeCost | null {
  if (!HAND_SLOTS.includes(slot)) return null;
  const kinds = touched.flatMap((equip) => equip?.stats?.category ?? []);
  if (kinds.includes('shield')) return 'action';
  if (!kinds.includes('weapon')) return null;
  return handSwapped ? 'action' : 'free';
}
