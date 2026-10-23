import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import type { MapCatalogKind } from 'shared';

export const MAP_CATALOG_KINDS: MapCatalogKind[] = [
  'monster',
  'item',
  'npc',
  'furniture',
];

export class MapCatalogQueryDto {
  @IsIn(MAP_CATALOG_KINDS, {
    message: 'kind — monster, item, npc или furniture',
  })
  kind: MapCatalogKind;

  // Часть названия; пусто — первые записи по алфавиту.
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'q — строка' })
  @MaxLength(100, { message: 'q — не длиннее 100 символов' })
  q?: string;
}
