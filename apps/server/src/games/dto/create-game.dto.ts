import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import {
  GAME_NAME_MAX,
  GAME_PASSWORD_MAX,
  GAME_SEATS_MAX,
  GAME_SEATS_MIN,
} from 'shared';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// Создание игры. Пустой пароль — то же, что без пароля: игра открытая.
export class CreateGameDto {
  @Transform(trim)
  @IsString({ message: 'Название игры — строка' })
  @Length(1, GAME_NAME_MAX, {
    message: `Название игры — от 1 до ${GAME_NAME_MAX} символов`,
  })
  name: string;

  @IsInt({ message: 'Число мест — целое число' })
  @Min(GAME_SEATS_MIN, {
    message: `Мест — от ${GAME_SEATS_MIN} до ${GAME_SEATS_MAX}`,
  })
  @Max(GAME_SEATS_MAX, {
    message: `Мест — от ${GAME_SEATS_MIN} до ${GAME_SEATS_MAX}`,
  })
  seatCount: number;

  @IsOptional()
  @IsString({ message: 'Пароль игры — строка' })
  @Length(0, GAME_PASSWORD_MAX, {
    message: `Пароль игры — не длиннее ${GAME_PASSWORD_MAX} символов`,
  })
  password?: string;
}
