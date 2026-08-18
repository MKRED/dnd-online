import { IsString, Length, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Length(3, 32)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'login must contain only latin letters, digits and underscore',
  })
  login: string;

  @IsString()
  @Length(2, 64)
  nickname: string;

  @IsString()
  @Length(6, 255)
  password: string;
}
