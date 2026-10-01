import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

// Создание и переименование карты — одно и то же поле.
export class MapNameDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'Название карты — строка' })
  @Length(1, 100, { message: 'Название карты — от 1 до 100 символов' })
  name: string;
}
