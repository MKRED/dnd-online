import { IsUUID, ValidateIf } from 'class-validator';

// Мастер отдаёт управление персонажем участнику или забирает его (null).
export class SeatControllerDto {
  @ValidateIf((_, value) => value !== null)
  @IsUUID('all', { message: 'Выберите участника игры' })
  controllerId: string | null;
}
