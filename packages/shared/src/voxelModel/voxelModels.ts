import type {
  CatalogEntryFields,
  CatalogEntryInputFields,
} from '../catalog.js';
import type { CatalogOrigin } from '../catalogOrigin.js';
import type { VoxelModelFields } from './voxelModel.js';

// Запись справочника «Модели» (docs/plan/blocks.md, этап 8а). Копия чужой модели
// ссылается на оригинал, как копия группы блоков. Загруженный файл (mesh, этап 9) в тело
// записи не входит: его меняют свои маршруты.
export type VoxelModelInput = CatalogEntryInputFields &
  Omit<VoxelModelFields, 'mesh'>;
export type VoxelModel = CatalogEntryFields &
  VoxelModelFields & { origin: CatalogOrigin | null };
