import { BadRequestException } from '@nestjs/common';
import {
  spendSpellSlots,
  type SpellSlots,
  type SpellSlotsExpended,
} from 'shared';

// Потраченные ячейки из PATCH поверх ячеек в базе (docs/plan/done/character-abilities.md).
// Считается от строки, прочитанной под блокировкой: два быстрых клика по кружкам не
// должны затереть друг друга.
export function spentSpellSlots(
  current: SpellSlots,
  expended: SpellSlotsExpended,
): SpellSlots {
  const result = spendSpellSlots(current, expended);
  if (!result.ok) {
    throw new BadRequestException(
      `Ячеек ${result.level} круга меньше, чем потрачено`,
    );
  }
  return result.slots;
}
