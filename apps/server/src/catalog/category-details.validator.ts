import { ValidationArguments, registerDecorator } from 'class-validator';

// Проверка details по категории — общая для каталогов: набор полей details зависит от
// category, поэтому проверка кросс-полевая. Каждый каталог передаёт свои проверки и
// тексты ошибок. Неизвестную категорию отклоняет её собственный декоратор, поэтому
// здесь ошибка не дублируется.
export function CategoryDetails<C extends string>(
  checks: Record<C, (details: object) => boolean>,
  messages: Partial<Record<C, string>>,
  defaultMessage: string,
) {
  const categories = Object.keys(checks);
  return function (target: object, propertyName: string) {
    registerDecorator({
      name: 'categoryDetails',
      target: target.constructor,
      propertyName,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const { category } = args.object as { category?: unknown };
          if (!categories.includes(category as string)) return true;
          if (typeof value !== 'object' || value === null) return false;
          if (Array.isArray(value)) return false;
          return checks[category as C](value);
        },
        defaultMessage(args: ValidationArguments) {
          const { category } = args.object as { category?: unknown };
          return messages[category as C] ?? defaultMessage;
        },
      },
    });
  };
}

// У категорий без своих полей details — только пустой объект.
export const isEmptyDetails = (details: object) =>
  Object.keys(details).length === 0;
