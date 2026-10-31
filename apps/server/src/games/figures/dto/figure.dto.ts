import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { GAME_MOVE_MODES, type GameMoveMode, type Vec3 } from 'shared';

const CELL_MESSAGE = 'Клетка — три целых числа [x, y, z]';

// Ход фигурки или существа сцены: клетка ног, куда оно идёт.
export class MoveFigureDto {
  @IsArray({ message: CELL_MESSAGE })
  @ArrayMinSize(3, { message: CELL_MESSAGE })
  @ArrayMaxSize(3, { message: CELL_MESSAGE })
  @IsInt({ each: true, message: CELL_MESSAGE })
  to: Vec3;
}

// Мастер ставит фигурку: клетка ног.
export class PlaceFigureDto {
  @IsArray({ message: CELL_MESSAGE })
  @ArrayMinSize(3, { message: CELL_MESSAGE })
  @ArrayMaxSize(3, { message: CELL_MESSAGE })
  @IsInt({ each: true, message: CELL_MESSAGE })
  at: Vec3;
}

// Мастер запрещает или разрешает игрокам ходить: одному герою или всем (characterId
// не передан или null).
export class MoveLockDto {
  @IsBoolean({ message: 'Запрет — да или нет (locked)' })
  locked: boolean;

  @IsOptional()
  @IsUUID('all', { message: 'Герой — id персонажа на месте' })
  characterId?: string | null;
}

// Мастер меняет режим хода игры (docs/dnd/movement.md).
export class MoveModeDto {
  @IsIn(GAME_MOVE_MODES, {
    message: 'Режим хода — «free» (свободный) или «tactical» (тактический)',
  })
  mode: GameMoveMode;
}
