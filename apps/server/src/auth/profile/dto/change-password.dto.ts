import { IsString, Length } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @Length(1, 255)
  currentPassword: string;

  @IsString()
  @Length(6, 255, { message: 'Пароль должен содержать минимум 6 символов' })
  newPassword: string;
}
