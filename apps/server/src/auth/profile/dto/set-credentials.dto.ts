import { IsString, Length, Matches } from 'class-validator';

// Те же правила, что при регистрации (RegisterDto), но тексты сразу по-русски:
// страница профиля показывает их как есть.
export class SetCredentialsDto {
  @IsString()
  @Length(3, 32, { message: 'Логин — от 3 до 32 символов' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Логин — только латинские буквы, цифры и подчёркивание',
  })
  login: string;

  @IsString()
  @Length(6, 255, { message: 'Пароль должен содержать минимум 6 символов' })
  password: string;
}
