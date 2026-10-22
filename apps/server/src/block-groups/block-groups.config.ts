import { readBlockGroupFields, type BlockGroupFields } from 'shared';
import type { CatalogAccess } from '../catalog/catalog-access.js';
import type { CatalogEntriesConfig } from '../catalog/entries/catalog-entries.service.js';
import type { CatalogImageConfig } from '../catalog/images/catalog-image.config.js';
import {
  blockGroupImageTables,
  blockGroups,
} from '../database/schema/index.js';
import type { BlockGroupDto } from './dto/block-group.dto.js';

// Справочник блоков на общем коде каталогов (docs/plan/blocks.md, этап 3).
export const BLOCK_GROUP_ACCESS: CatalogAccess = {
  table: blockGroups,
  id: blockGroups.id,
  authorId: blockGroups.authorId,
  isPublic: blockGroups.isPublic,
  notFound: 'Группа блоков не найдена',
  authorOnly: 'Менять группу блоков может только её автор',
};

// Категорий у групп нет; колонка обязательна для заготовки каталога.
const STORED_CATEGORY = 'block';

export const BLOCK_GROUPS_CONFIG: CatalogEntriesConfig<
  BlockGroupFields,
  BlockGroupDto
> = {
  catalog: 'blockGroup',
  table: blockGroups,
  images: blockGroupImageTables,
  access: BLOCK_GROUP_ACCESS,
  toVariant: (_category, details, extra) =>
    readBlockGroupFields(details, extra),
  toStored: (dto) => ({
    category: STORED_CATEGORY,
    details: {
      opaque: dto.opaque,
      durability: dto.durability,
      flammable: dto.flammable,
      movementCost: dto.movementCost,
      climbable: dto.climbable,
      hazard: dto.hazard,
    },
    extra: { look: dto.look, color: dto.color, textures: dto.textures },
  }),
};

export const BLOCK_GROUP_IMAGE_CONFIG: CatalogImageConfig = {
  catalog: 'blockGroup',
  access: BLOCK_GROUP_ACCESS,
  tables: blockGroupImageTables,
  noImage: 'У группы блоков нет картинки',
};
