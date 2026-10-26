import { IsIn, IsInt, Max, Min, ValidateIf } from 'class-validator';
import {
  GAME_CREATURE_CHANGE_KINDS,
  HIT_POINTS_CHANGE_MAX,
  type GameCreatureChange,
} from 'shared';
import {
  AMOUNT,
  DamageParts,
  needsAmount,
  toDamageChange,
  type DamagePartDto,
} from '../../dto/damage-parts.dto.js';

// Правка хитов монстра или НПС: урон (числом или по частям с типами), лечение или
// временные хиты.
export class CreatureChangeDto {
  @IsIn(GAME_CREATURE_CHANGE_KINDS, { message: 'Неизвестная правка' })
  kind: GameCreatureChange['kind'];

  @ValidateIf(needsAmount)
  @IsInt({ message: AMOUNT })
  @Min(0, { message: AMOUNT })
  @Max(HIT_POINTS_CHANGE_MAX, { message: AMOUNT })
  amount?: number;

  @DamageParts()
  parts?: DamagePartDto[];
}

export function toCreatureChange(dto: CreatureChangeDto): GameCreatureChange {
  return dto.kind === 'damage'
    ? toDamageChange(dto)
    : { kind: dto.kind, amount: dto.amount ?? 0 };
}
