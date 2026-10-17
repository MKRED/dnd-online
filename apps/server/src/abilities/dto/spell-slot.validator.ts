import { ValidationArguments, registerDecorator } from 'class-validator';
import { isAbilityCosts, isSpellDetails, spellSlotFits } from 'shared';

// У заклинания ячейка в затратах — ровно его круга, у заговора её нет (spellSlotFits).
// Проверка кросс-полевая: затраты сверяются с кругом из details. Неверные затраты или
// поля заклинания отклоняют их собственные проверки, здесь ошибка не дублируется.
export function SpellSlotFitsLevel() {
  return function (target: object, propertyName: string) {
    registerDecorator({
      name: 'spellSlotFitsLevel',
      target: target.constructor,
      propertyName,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const { category, details } = args.object as {
            category?: unknown;
            details?: unknown;
          };
          if (category !== 'spell' || !isSpellDetails(details)) return true;
          if (!isAbilityCosts(value)) return true;
          return spellSlotFits(details.level, value);
        },
        defaultMessage: () =>
          'Ячейка заклинаний должна быть круга заклинания, у заговора её нет',
      },
    });
  };
}
