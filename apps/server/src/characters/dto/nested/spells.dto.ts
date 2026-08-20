import {
  IsBoolean,
  IsInt,
  IsString,
  Length,
  Max,
  Min,
  ValidateBy,
  buildMessage,
} from 'class-validator';

export class KnownSpellDto {
  @IsString()
  @Length(1, 100)
  name: string;

  @IsInt()
  @Min(0)
  @Max(9)
  level: number;

  @IsString()
  @Length(1, 50)
  class: string;

  @IsBoolean()
  prepared: boolean;
}

// spellSlots хранится как Record<string, {total, expended}> (ключи "1".."9" —
// уровень заклинания), а не массив/DTO-класс, поэтому ValidateNested тут не
// применим напрямую — пишем форму вручную через ValidateBy.
function isSpellSlotsShape(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return Object.entries(value as Record<string, unknown>).every(
    ([level, slot]) => {
      if (!/^[1-9]$/.test(level)) {
        return false;
      }
      if (typeof slot !== 'object' || slot === null) {
        return false;
      }
      const { total, expended } = slot as Record<string, unknown>;
      return (
        typeof total === 'number' &&
        Number.isInteger(total) &&
        total >= 0 &&
        typeof expended === 'number' &&
        Number.isInteger(expended) &&
        expended >= 0 &&
        expended <= total
      );
    },
  );
}

export function IsSpellSlots() {
  return ValidateBy({
    name: 'isSpellSlots',
    validator: {
      validate: (value: unknown) => isSpellSlotsShape(value),
      defaultMessage: buildMessage(
        (eachPrefix) =>
          `${eachPrefix}spellSlots must be a record of spell level ("1"-"9") to { total: non-negative int, expended: non-negative int <= total }`,
      ),
    },
  });
}
