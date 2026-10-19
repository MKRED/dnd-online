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
import { SPELL_SLOT_TOTAL_MAX } from 'shared';

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
        total <= SPELL_SLOT_TOTAL_MAX &&
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
          `${eachPrefix}spellSlots must be a record of spell level ("1"-"9") to { total: int 0-${SPELL_SLOT_TOTAL_MAX}, expended: non-negative int <= total }`,
      ),
    },
  });
}

// Потраченные ячейки в точечном PATCH: круг "1".."9" → целое от 0. Больше ли это, чем
// ячеек круга, проверяет сервис: число ячеек лежит в базе, а не в запросе.
function isSpellSlotsExpendedShape(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  return Object.entries(value as Record<string, unknown>).every(
    ([level, spent]) =>
      /^[1-9]$/.test(level) &&
      typeof spent === 'number' &&
      Number.isInteger(spent) &&
      spent >= 0,
  );
}

export function IsSpellSlotsExpended() {
  return ValidateBy({
    name: 'isSpellSlotsExpended',
    validator: {
      validate: (value: unknown) => isSpellSlotsExpendedShape(value),
      defaultMessage: buildMessage(
        () =>
          'Потраченные ячейки — по кругам от 1 до 9, целое число не меньше 0',
      ),
    },
  });
}
