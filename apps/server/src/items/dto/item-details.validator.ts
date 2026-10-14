import { ValidationArguments, registerDecorator } from 'class-validator';
import { ITEM_CATEGORIES, ITEM_SATIETY_MAX, type ItemCategory } from 'shared';

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

const DETAILS_CHECKS: Record<ItemCategory, (details: object) => boolean> = {
  basic: isEmpty,
  food: isFood,
  material: isEmpty,
  quest: isEmpty,
};

// Текст ошибки — для поля, которое правит человек; лишние поля шлёт только чужой клиент.
const MESSAGES: Partial<Record<ItemCategory, string>> = {
  food: `Насыщение — целое число от 0 до ${ITEM_SATIETY_MAX}`,
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
