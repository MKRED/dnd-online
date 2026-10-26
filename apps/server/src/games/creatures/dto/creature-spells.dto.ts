import { IsBoolean } from 'class-validator';
import type { SpellSlotsExpended } from 'shared';
import { IsSpellSlotsExpended } from '../../../characters/dto/nested/spells.dto.js';

// Потраченные ячейки экземпляра НПС по кругам — как на листе.
export class CreatureSlotsDto {
  @IsSpellSlotsExpended()
  expended: SpellSlotsExpended;
}

export class CreaturePreparedDto {
  @IsBoolean({ message: 'Отметка подготовки — да или нет' })
  prepared: boolean;
}
