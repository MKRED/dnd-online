import { IsOptional, IsString, MaxLength } from 'class-validator';
import { GAME_PASSWORD_MAX } from 'shared';

// Вход в лобби. Пароль нужен только закрытой игре и только в первый раз.
export class EnterGameDto {
  @IsOptional()
  @IsString({ message: 'Пароль игры — строка' })
  @MaxLength(GAME_PASSWORD_MAX)
  password?: string;
}
