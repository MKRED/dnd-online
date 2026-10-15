import type { CatalogImageConfig } from '../catalog/images/catalog-image.config.js';
import { itemImageTables } from '../database/schema/index.js';
import { ITEM_ACCESS } from '../items/item-access.js';

export const ITEM_IMAGE_CONFIG: CatalogImageConfig = {
  catalog: 'item',
  access: ITEM_ACCESS,
  tables: itemImageTables,
  noImage: 'У предмета нет картинки',
};
