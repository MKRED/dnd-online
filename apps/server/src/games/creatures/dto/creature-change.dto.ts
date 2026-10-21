import { IsIn, IsInt, Max, Min } from 'class-validator';
import {
  GAME_CREATURE_CHANGE_KINDS,
  HIT_POINTS_CHANGE_MAX,
  type GameCreatureChange,
} from 'shared';

const AMOUNT = 'Число от 0 до 9999';

// Правка хитов монстра или НПС: урон, лечение или временные хиты.
export class CreatureChangeDto {
  @IsIn(GAME_CREATURE_CHANGE_KINDS, { message: 'Неизвестная правка' })
  kind: GameCreatureChange['kind'];

  @IsInt({ message: AMOUNT })
  @Min(0, { message: AMOUNT })
  @Max(HIT_POINTS_CHANGE_MAX, { message: AMOUNT })
  amount: number;
}
