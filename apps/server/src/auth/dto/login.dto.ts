import { IsString, Length } from 'class-validator';

export class LoginDto {
  @IsString()
  @Length(1, 32)
  login: string;

  @IsString()
  @Length(1, 255)
  password: string;
}
