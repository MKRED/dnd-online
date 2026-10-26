import { registerDecorator, type ValidationArguments } from 'class-validator';
import {
  equipmentRarityProblem,
  isEquipmentCategory,
  type ItemCategory,
  type ItemRarity,
} from 'shared';

// Бонус магии и настройка у экипировки — только с редкостью (equipmentRarityProblem).
// Стоит на rarity: ошибка про редкость, а поля категории проверены отдельно.
export function MagicNeedsRarity() {
  return function (target: object, propertyName: string) {
    registerDecorator({
      name: 'magicNeedsRarity',
      target: target.constructor,
      propertyName,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const { category, details } = args.object as {
            category?: unknown;
            details?: unknown;
          };
          if (!isEquipmentCategory(category as ItemCategory)) return true;
          if (typeof details !== 'object' || details === null) return true;
          return equipmentRarityProblem(details, value as ItemRarity) === null;
        },
        defaultMessage: () =>
          'Бонус магии и настройка бывают только у магического предмета: выберите редкость',
      },
    });
  };
}
