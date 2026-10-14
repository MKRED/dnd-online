import {
  ValidationArguments,
  isUUID,
  registerDecorator,
} from 'class-validator';
import {
  ITEM_CATEGORIES,
  ITEM_MAX_WEIGHT,
  ITEM_PACK_MAX_ENTRIES,
  ITEM_PACK_MAX_QUANTITY,
  ITEM_SATIETY_MAX,
  TREASURE_KINDS,
  type ItemCategory,
  type TreasureKind,
} from 'shared';

// Проверка details для каждой категории. У категорий без своих полей — только пустой
// объект. Поля у категорий пока простые, поэтому хватает функции; категория с
// вложенными полями заведёт свой DTO-класс (validateSync с whitelist и
// forbidNonWhitelisted).
const isEmpty = (details: object) => Object.keys(details).length === 0;

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
  basic: isEmpty,
  food: isFood,
  material: isEmpty,
  quest: isEmpty,
  treasure: isTreasure,
  container: isContainer,
  pack: isPack,
};

// Текст ошибки — для поля, которое правит человек; лишние поля шлёт только чужой клиент.
const MESSAGES: Partial<Record<ItemCategory, string>> = {
  food: `Насыщение — целое число от 0 до ${ITEM_SATIETY_MAX}`,
  treasure: 'Выберите вид сокровища',
  container: `Груз — больше 0 и до ${ITEM_MAX_WEIGHT} фнт., не больше двух знаков после запятой`,
  pack: `В наборе — от 1 до ${ITEM_PACK_MAX_ENTRIES} разных предметов, количество каждого — целое от 1 до ${ITEM_PACK_MAX_QUANTITY}`,
};
const DEFAULT_MESSAGE = 'Поля предмета не подходят к его категории';

// Кросс-полевая проверка: набор полей details зависит от category. Неизвестную категорию
// отклоняет её собственный декоратор, поэтому здесь ошибка не дублируется.
export function DetailsForCategory() {
  return function (target: object, propertyName: string) {
    registerDecorator({
      name: 'detailsForCategory',
      target: target.constructor,
      propertyName,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const { category } = args.object as { category?: unknown };
          if (!ITEM_CATEGORIES.includes(category as ItemCategory)) return true;
          if (typeof value !== 'object' || value === null) return false;
          if (Array.isArray(value)) return false;
          return DETAILS_CHECKS[category as ItemCategory](value);
        },
        defaultMessage(args: ValidationArguments) {
          const { category } = args.object as { category?: unknown };
          return MESSAGES[category as ItemCategory] ?? DEFAULT_MESSAGE;
        },
      },
    });
  };
}
