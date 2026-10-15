import type { CatalogEntryFields } from 'shared';
import type { CatalogEntryTable } from '../../database/schema/index.js';
import {
  toCatalogImage,
  type CatalogImageRow,
} from '../catalog-image.mapper.js';
import type { CatalogEntryDto } from './dto/catalog-entry.dto.js';

export type CatalogEntryRow = CatalogEntryTable['$inferSelect'];
type NewCatalogEntryRow = CatalogEntryTable['$inferInsert'];

// Категория, её поля и поля каталога (extra) из базы. Каждый каталог читает их сам: в
// базе category — строка, а в API — размеченное объединение каталога.
export type ToVariant<V> = (
  category: string,
  details: Record<string, unknown>,
  extra: Record<string, unknown>,
) => V;

// Поля каталога из тела запроса — в колонку extra. У каталога без своих полей её нет.
export type ToExtra<D> = (dto: D) => Record<string, unknown>;

export function toCatalogEntry<V>(
  row: CatalogEntryRow,
  authorNickname: string,
  image: CatalogImageRow | null,
  toVariant: ToVariant<V>,
): V & CatalogEntryFields {
  return {
    id: row.id,
    authorId: row.authorId,
    authorNickname,
    isPublic: row.isPublic,
    name: row.name,
    ...toVariant(row.category, row.details, row.extra),
    description: row.description,
    image: toCatalogImage(image),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// Поля записи из DTO — общая часть создания и полного редактирования (PUT).
export function toCatalogEntryValues<D extends CatalogEntryDto>(
  dto: D,
  toExtra?: ToExtra<D>,
): Omit<NewCatalogEntryRow, 'authorId'> {
  return {
    name: dto.name,
    category: dto.category,
    // Копия, а не сам объект: у интерфейсов полей нет индексной сигнатуры, которую ждёт
    // колонка.
    details: { ...dto.details },
    extra: toExtra?.(dto) ?? {},
    description: dto.description ?? '',
    isPublic: dto.isPublic,
  };
}
