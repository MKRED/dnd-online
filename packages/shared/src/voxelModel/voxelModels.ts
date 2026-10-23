import type {
  CatalogEntryFields,
  CatalogEntryInputFields,
} from '../catalog.js';
import type { CatalogOrigin } from '../catalogOrigin.js';
import type { VoxelModelFields } from './voxelModel.js';

// Запись справочника «Модели» (docs/plan/blocks.md, этап 8а). Копия чужой модели
// ссылается на оригинал, как копия группы блоков.
export type VoxelModelInput = CatalogEntryInputFields & VoxelModelFields;
export type VoxelModel = CatalogEntryFields &
  VoxelModelFields & { origin: CatalogOrigin | null };
