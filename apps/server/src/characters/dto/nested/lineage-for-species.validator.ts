import { ValidationArguments, registerDecorator } from 'class-validator';
import { SPECIES_WITH_LINEAGE, type CharacterSpecies } from 'shared';

// Кросс-полевая проверка: род или наследие есть не у каждого вида. Незаполненное поле
// сюда не доходит — его отсекает @IsOptional. Неизвестный вид отклоняет его собственный
// декоратор, поэтому здесь он ошибку не дублирует.
export function LineageForSpecies() {
  return function (target: object, propertyName: string) {
    registerDecorator({
      name: 'lineageForSpecies',
      target: target.constructor,
      propertyName,
      validator: {
        validate(_value: unknown, args: ValidationArguments) {
          const { species } = args.object as { species?: unknown };
          return SPECIES_WITH_LINEAGE.includes(species as CharacterSpecies);
        },
        defaultMessage() {
          return 'У этого вида нет рода или наследия';
        },
      },
    });
  };
}
