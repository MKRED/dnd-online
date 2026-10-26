import { isUUID } from 'class-validator';
import {
  ITEM_MAX_WEIGHT,
  ITEM_PACK_MAX_ENTRIES,
  ITEM_PACK_MAX_QUANTITY,
  ITEM_SATIETY_MAX,
  TREASURE_KINDS,
  armorDetailsProblem,
  shieldDetailsProblem,
  clothingDetailsProblem,
  jewelryDetailsProblem,
  weaponDetailsProblem,
  type ItemCategory,
  type TreasureKind,
} from 'shared';
import {
  CategoryDetails,
  type DetailsMessage,
  isEmptyDetails,
} from '../../catalog/category-details.validator.js';

// Проверка details для каждой категории. У категорий без своих полей — только пустой
// объект. Экипировку проверяют функции из shared (itemEquipmentCheck.ts): они же
// называют первое неверное поле.

function isFood(details: object): boolean {
  const keys = Object.keys(details);
  const { satiety } = details as { satiety?: unknown };
  return (
    keys.length === 1 &&
    keys[0] === 'satiety' &&
    Number.isInteger(satiety) &&
    (satiety as number) >= 0 &&
    (satiety as number) <= ITEM_SATIETY_MAX
  );
}

function isTreasure(details: object): boolean {
  const keys = Object.keys(details);
  const { kind } = details as { kind?: unknown };
  return (
    keys.length === 1 &&
    keys[0] === 'kind' &&
    TREASURE_KINDS.includes(kind as TreasureKind)
  );
}

// Груз — как вес: больше нуля, до сотых (сравнение с допуском, 0.29 * 100 — 28,999…).
// Ноль не пускаем: «не указан» — это null.
function isCapacity(value: unknown): boolean {
  if (value === null) return true;
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  return (
    value > 0 &&
    value <= ITEM_MAX_WEIGHT &&
    Math.abs(Math.round(value * 100) - value * 100) < 1e-6
  );
}

function isContainer(details: object): boolean {
  const keys = Object.keys(details);
  const { capacity } = details as { capacity?: unknown };
  return keys.length === 1 && keys[0] === 'capacity' && isCapacity(capacity);
}

function isPackEntry(entry: unknown): boolean {
  if (typeof entry !== 'object' || entry === null) return false;
  const keys = Object.keys(entry).sort();
  const { itemId, quantity } = entry as {
    itemId?: unknown;
    quantity?: unknown;
  };
  return (
    keys.length === 2 &&
    keys[0] === 'itemId' &&
    keys[1] === 'quantity' &&
    isUUID(itemId) &&
    Number.isInteger(quantity) &&
    (quantity as number) >= 1 &&
    (quantity as number) <= ITEM_PACK_MAX_QUANTITY
  );
}

// Только форма состава: строки, количество, повторы. Существуют ли предметы и видны ли
// они автору, проверяет сервис по базе (pack-contents).
function isPack(details: object): boolean {
  const keys = Object.keys(details);
  const { contents } = details as { contents?: unknown };
  if (keys.length !== 1 || keys[0] !== 'contents') return false;
  if (!Array.isArray(contents)) return false;
  if (contents.length < 1 || contents.length > ITEM_PACK_MAX_ENTRIES)
    return false;
  if (!contents.every(isPackEntry)) return false;
  const ids = contents.map((entry: { itemId: string }) => entry.itemId);
  return new Set(ids).size === ids.length;
}

const DETAILS_CHECKS: Record<ItemCategory, (details: object) => boolean> = {
  basic: isEmptyDetails,
  food: isFood,
  material: isEmptyDetails,
  quest: isEmptyDetails,
  treasure: isTreasure,
  container: isContainer,
  pack: isPack,
  weapon: (details) => weaponDetailsProblem(details) === null,
  armor: (details) => armorDetailsProblem(details) === null,
  shield: (details) => shieldDetailsProblem(details) === null,
  clothing: (details) => clothingDetailsProblem(details) === null,
  jewelry: (details) => jewelryDetailsProblem(details) === null,
};

// Текст ошибки — для поля, которое правит человек; лишние поля шлёт только чужой клиент.
const MESSAGES: Partial<Record<ItemCategory, DetailsMessage>> = {
  food: `Насыщение — целое число от 0 до ${ITEM_SATIETY_MAX}`,
  treasure: 'Выберите вид сокровища',
  container: `Груз — больше 0 и до ${ITEM_MAX_WEIGHT} фнт., не больше двух знаков после запятой`,
  pack: `В наборе — от 1 до ${ITEM_PACK_MAX_ENTRIES} разных предметов, количество каждого — целое от 1 до ${ITEM_PACK_MAX_QUANTITY}`,
  weapon: weaponDetailsProblem,
  armor: armorDetailsProblem,
  shield: shieldDetailsProblem,
  clothing: clothingDetailsProblem,
  jewelry: jewelryDetailsProblem,
};
const DEFAULT_MESSAGE = 'Поля предмета не подходят к его категории';

// Кросс-полевая проверка — общая для каталогов (CategoryDetails).
export function DetailsForCategory() {
  return CategoryDetails(DETAILS_CHECKS, MESSAGES, DEFAULT_MESSAGE);
}
