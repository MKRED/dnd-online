import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';
import {
  NICKNAME_CONTROL_MESSAGE,
  NICKNAME_LENGTH_MESSAGE,
  NICKNAME_MAX,
  NICKNAME_MIN,
  NICKNAME_PATTERN,
  normalizeNickname,
} from 'shared';

// Правила ника из shared/nickname: одни при регистрации и при смене в профиле. Ник
// сначала приводится к виду, в котором его сохраним, и только потом проверяется.
export function NicknameRules() {
  return applyDecorators(
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? normalizeNickname(value) : value,
    ),
    IsString({ message: NICKNAME_LENGTH_MESSAGE }),
    Length(NICKNAME_MIN, NICKNAME_MAX, { message: NICKNAME_LENGTH_MESSAGE }),
    Matches(NICKNAME_PATTERN, { message: NICKNAME_CONTROL_MESSAGE }),
  );
}
