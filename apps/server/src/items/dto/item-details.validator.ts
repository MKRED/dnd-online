import { ValidationArguments, registerDecorator } from 'class-validator';
import { ITEM_CATEGORIES, type ItemCategory } from 'shared';

// Проверка details для каждой категории. У «Базового» своих полей нет — только пустой
// объект. Категории со своими полями добавят сюда проверку своим DTO-классом
// (validateSync с whitelist и forbidNonWhitelisted).
const DETAILS_CHECKS: Record<ItemCategory, (details: object) => boolean> = {
  basic: (details) => Object.keys(details).length === 0,
};

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
        defaultMessage() {
          return 'Поля предмета не подходят к его категории';
        },
      },
    });
  };
}
