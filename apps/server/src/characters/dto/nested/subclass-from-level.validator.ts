import { ValidationArguments, registerDecorator } from 'class-validator';
import { SUBCLASS_MIN_LEVEL } from 'shared';

// Кросс-полевая проверка: подкласс выбирают на 3-м уровне класса, поэтому на 1–2 уровне
// его быть не может. Незаполненный подкласс сюда не доходит — его отсекает @IsOptional.
export function SubclassFromLevel() {
  return function (target: object, propertyName: string) {
    registerDecorator({
      name: 'subclassFromLevel',
      target: target.constructor,
      propertyName,
      validator: {
        validate(_value: unknown, args: ValidationArguments) {
          const { level } = args.object as { level?: unknown };
          return typeof level !== 'number' || level >= SUBCLASS_MIN_LEVEL;
        },
        defaultMessage() {
          return `Подкласс доступен с ${SUBCLASS_MIN_LEVEL}-го уровня класса`;
        },
      },
    });
  };
}
