import type { CatalogImage } from 'shared';
import type { CatalogImageTables } from '../database/schema/index.js';

export type CatalogImageRow = CatalogImageTables['images']['$inferSelect'];

// Метаданные картинки без байтов — для карточки, списка и строк, где запись показана
// миниатюрой (состав набора, инвентарь).
export function toCatalogImage(row: CatalogImageRow): CatalogImage;
export function toCatalogImage(
  row: CatalogImageRow | null,
): CatalogImage | null;
export function toCatalogImage(
  row: CatalogImageRow | null,
): CatalogImage | null {
  return row
    ? {
        version: row.version,
        width: row.width,
        height: row.height,
        thumbCrop: row.thumbCrop,
      }
    : null;
}
