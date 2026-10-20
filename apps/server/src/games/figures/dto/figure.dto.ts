import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt } from 'class-validator';
import type { Vec3 } from 'shared';

const CELL_MESSAGE = 'Клетка — три целых числа [x, y, z]';

// Ход фигурки: клетка ног, куда она идёт.
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
