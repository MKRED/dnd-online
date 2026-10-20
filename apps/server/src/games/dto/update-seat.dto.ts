import { IsBoolean } from 'class-validator';

// Игрок меняет своё место: пока только разрешение передавать управление.
export class UpdateSeatDto {
  @IsBoolean({ message: 'Разрешение передавать управление — да или нет' })
  allowHandover: boolean;
}
