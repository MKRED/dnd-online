import type { CatalogImageTables } from '../../database/schema/index.js';
import type { CatalogAccess } from '../catalog-access.js';

// Чем картинки одного каталога отличаются от другого: таблицы, доступ к записи и текст
// «нет картинки». catalog — имя каталога в логах (item, ability, effect).
export interface CatalogImageConfig {
  catalog: string;
  access: CatalogAccess;
  tables: CatalogImageTables;
  noImage: string;
}
