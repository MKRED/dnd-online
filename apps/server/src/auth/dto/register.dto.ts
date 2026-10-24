import { IsString, Length, Matches } from 'class-validator';
import { NicknameRules } from './nickname-rules.js';

export class RegisterDto {
  @IsString()
  @Length(3, 32)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'login must contain only latin letters, digits and underscore',
  })
  login: string;

  @NicknameRules()
  nickname: string;

  @IsString()
  @Length(6, 255)
  password: string;
}
