import type { ItemCost } from './items.js';
import type { ArmorItemDetails, BookArmor } from './itemEquipment.js';

// Таблица доспехов книги 2024 (свободные правила, Equipment, проверено 2026-10-26;
// docs/dnd/weapons-armor.md). Форма предмета заполняет из неё поля по выбранному образцу.

export type BookArmorStats = Pick<
  ArmorItemDetails,
  'kind' | 'armorClass' | 'strength' | 'stealthDisadvantage'
> & { weight: number; cost: ItemCost };

const gp = (amount: number): ItemCost => ({ amount, coin: 'gp' });

function armor(
  kind: ArmorItemDetails['kind'],
  armorClass: number,
  strength: number | null,
  stealthDisadvantage: boolean,
  weight: number,
  cost: ItemCost,
): BookArmorStats {
  return { kind, armorClass, strength, stealthDisadvantage, weight, cost };
}

export const BOOK_ARMOR_STATS: Record<BookArmor, BookArmorStats> = {
  padded: armor('light', 11, null, true, 8, gp(5)),
  leather: armor('light', 11, null, false, 10, gp(10)),
  studdedLeather: armor('light', 12, null, false, 13, gp(45)),
  hide: armor('medium', 12, null, false, 12, gp(10)),
  chainShirt: armor('medium', 13, null, false, 20, gp(50)),
  scaleMail: armor('medium', 14, null, true, 45, gp(50)),
  breastplate: armor('medium', 14, null, false, 20, gp(400)),
  halfPlate: armor('medium', 15, null, true, 40, gp(750)),
  ringMail: armor('heavy', 14, null, true, 40, gp(30)),
  chainMail: armor('heavy', 16, 13, true, 55, gp(75)),
  splint: armor('heavy', 17, 15, true, 60, gp(200)),
  plate: armor('heavy', 18, 15, true, 65, gp(1500)),
};

// Щит книги: +2 к КД, 6 фнт., 10 ЗМ.
export const BOOK_SHIELD = { armorClass: 2, weight: 6, cost: gp(10) } as const;
