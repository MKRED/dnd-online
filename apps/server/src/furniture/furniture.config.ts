import {
  isFurnitureMount,
  readCatalogOrigin,
  type CatalogOrigin,
  type FurnitureFields,
  type FurnitureModel,
} from 'shared';
import type { CatalogAccess } from '../catalog/catalog-access.js';
import type { CatalogEntriesConfig } from '../catalog/entries/catalog-entries.service.js';
import type { CatalogImageConfig } from '../catalog/images/catalog-image.config.js';
import { furniture, furnitureImageTables } from '../database/schema/index.js';
import type { FurnitureDto } from './dto/furniture.dto.js';

// Справочник «Обстановка» на общем коде каталогов (docs/plan/blocks.md, этап 8б).
export const FURNITURE_ACCESS: CatalogAccess = {
  table: furniture,
  id: furniture.id,
  authorId: furniture.authorId,
  isPublic: furniture.isPublic,
  notFound: 'Обстановка не найдена',
  authorOnly: 'Менять обстановку может только её автор',
};

// Обстановка в ответах API: поля формы, модель целиком и ссылка копии на оригинал.
// Модель и видимость оригинала дописывает attachLinks сервиса.
export type FurnitureVariant = FurnitureFields & {
  model: FurnitureModel | null;
  origin: CatalogOrigin | null;
};

// Категорий у обстановки нет; колонка обязательна для заготовки каталога.
const STORED_CATEGORY = 'furniture';

export const FURNITURE_CONFIG: CatalogEntriesConfig<
  FurnitureVariant,
  FurnitureDto
> = {
  catalog: 'furniture',
  table: furniture,
  images: furnitureImageTables,
  access: FURNITURE_ACCESS,
  toVariant: (_category, _details, extra) => {
    const origin = readCatalogOrigin(extra);
    return {
      modelId: typeof extra.modelId === 'string' ? extra.modelId : '',
      mount: isFurnitureMount(extra.mount) ? extra.mount : 'floor',
      model: null,
      origin: origin && { ...origin, available: false, updated: false },
    };
  },
  // Правка копии в форме не теряет её ссылку на оригинал.
  keptExtra: ['origin'],
  toStored: (dto) => ({
    category: STORED_CATEGORY,
    details: {},
    extra: { modelId: dto.modelId, mount: dto.mount },
  }),
};

export const FURNITURE_IMAGE_CONFIG: CatalogImageConfig = {
  catalog: 'furniture',
  access: FURNITURE_ACCESS,
  tables: furnitureImageTables,
  noImage: 'У обстановки нет картинки',
};
