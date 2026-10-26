import { IsIn, IsInt, Max, Min, ValidateIf } from 'class-validator';
import {
  DEATH_SAVES_MAX,
  HIT_POINTS_CHANGE_KINDS,
  HIT_POINTS_CHANGE_MAX,
  type GameCharacterChange,
  type SpellSlotsExpended,
} from 'shared';
import { IsSpellSlotsExpended } from '../../../characters/dto/nested/spells.dto.js';
import {
  AMOUNT,
  DamageParts,
  needsAmount,
  toDamageChange,
  type DamagePartDto,
} from '../../dto/damage-parts.dto.js';

const KINDS = [...HIT_POINTS_CHANGE_KINDS, 'spell_slots'] as const;
type Kind = (typeof KINDS)[number];

const SAVES = 'Число спасбросков — от 0 до 3';

// Правка персонажа в игре: одно тело на все виды, поля — по виду (shared/hitPoints.ts).
export class CharacterChangeDto {
  @IsIn(KINDS, { message: 'Неизвестная правка' })
  kind: Kind;

  @ValidateIf(needsAmount)
  @IsInt({ message: AMOUNT })
  @Min(0, { message: AMOUNT })
  @Max(HIT_POINTS_CHANGE_MAX, { message: AMOUNT })
  amount?: number;

  // Урон по частям с типами — вместо amount.
  @DamageParts()
  parts?: DamagePartDto[];

  @ValidateIf((dto: CharacterChangeDto) => dto.kind === 'death_saves')
  @IsInt({ message: SAVES })
  @Min(0, { message: SAVES })
  @Max(DEATH_SAVES_MAX, { message: SAVES })
  successes?: number;

  @ValidateIf((dto: CharacterChangeDto) => dto.kind === 'death_saves')
  @IsInt({ message: SAVES })
  @Min(0, { message: SAVES })
  @Max(DEATH_SAVES_MAX, { message: SAVES })
  failures?: number;

  @ValidateIf((dto: CharacterChangeDto) => dto.kind === 'spell_slots')
  @IsSpellSlotsExpended()
  expended?: SpellSlotsExpended;
}

// Тело в правку для shared: лишние поля чужих видов отбрасываются.
export function toCharacterChange(
  dto: CharacterChangeDto,
): GameCharacterChange {
  switch (dto.kind) {
    case 'damage':
      return toDamageChange(dto);
    case 'heal':
    case 'temp':
      return { kind: dto.kind, amount: dto.amount ?? 0 };
    case 'death_saves':
      return {
        kind: dto.kind,
        successes: dto.successes ?? 0,
        failures: dto.failures ?? 0,
      };
    case 'spell_slots':
      return { kind: dto.kind, expended: dto.expended ?? {} };
  }
}
