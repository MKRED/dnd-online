import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

export class CreateApiTokenDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'Название токена — строка' })
  @Length(1, 100, { message: 'Название токена — от 1 до 100 символов' })
  name: string;
}
