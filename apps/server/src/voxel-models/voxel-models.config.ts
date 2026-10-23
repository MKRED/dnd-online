import {
  readCatalogOrigin,
  readVoxelModelFields,
  type CatalogOrigin,
  type VoxelModelFields,
} from 'shared';
import type { CatalogAccess } from '../catalog/catalog-access.js';
import type { CatalogEntriesConfig } from '../catalog/entries/catalog-entries.service.js';
import type { CatalogImageConfig } from '../catalog/images/catalog-image.config.js';
import {
  voxelModelImageTables,
  voxelModels,
} from '../database/schema/index.js';
import type { VoxelModelDto } from './dto/voxel-model.dto.js';

// Справочник «Модели» на общем коде каталогов (docs/plan/blocks.md, этап 8а).
export const VOXEL_MODEL_ACCESS: CatalogAccess = {
  table: voxelModels,
  id: voxelModels.id,
  authorId: voxelModels.authorId,
  isPublic: voxelModels.isPublic,
  notFound: 'Модель не найдена',
  authorOnly: 'Менять модель может только её автор',
};

// Модель в ответах API: поля формы и ссылка копии на оригинал. Видим ли оригинал и
// менялся ли он, дописывает attachLinks сервиса.
export type VoxelModelVariant = VoxelModelFields & {
  origin: CatalogOrigin | null;
};

// Категорий у моделей нет; колонка обязательна для заготовки каталога.
const STORED_CATEGORY = 'model';

export const VOXEL_MODELS_CONFIG: CatalogEntriesConfig<
  VoxelModelVariant,
  VoxelModelDto
> = {
  catalog: 'voxelModel',
  table: voxelModels,
  images: voxelModelImageTables,
  access: VOXEL_MODEL_ACCESS,
  toVariant: (_category, _details, extra) => {
    const origin = readCatalogOrigin(extra);
    return {
      ...readVoxelModelFields(extra),
      origin: origin && { ...origin, available: false, updated: false },
    };
  },
  // Правка копии в форме не теряет её ссылку на оригинал, а правка модели с файлом — сам
  // файл: его меняют свои маршруты (этап 9).
  keptExtra: ['origin', 'mesh'],
  toStored: (dto) => ({
    category: STORED_CATEGORY,
    details: {},
    extra: {
      size: dto.size,
      palette: dto.palette,
      voxels: dto.voxels,
      cells: dto.cells,
    },
  }),
};

export const VOXEL_MODEL_IMAGE_CONFIG: CatalogImageConfig = {
  catalog: 'voxelModel',
  access: VOXEL_MODEL_ACCESS,
  tables: voxelModelImageTables,
  noImage: 'У модели нет картинки',
};
