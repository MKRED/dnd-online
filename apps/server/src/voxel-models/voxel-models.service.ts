import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { CatalogEntryFields } from 'shared';
import { attachOrigins } from '../catalog/copies/catalog-origins.js';
import { CatalogEntriesService } from '../catalog/entries/catalog-entries.service.js';
import { DatabaseService } from '../database/database.service.js';
import { voxelModels } from '../database/schema/index.js';
import type { VoxelModelDto } from './dto/voxel-model.dto.js';
import {
  VOXEL_MODELS_CONFIG,
  type VoxelModelVariant,
} from './voxel-models.config.js';

// Модели пока ни на что не ссылаются и ни в чём не стоят: роли (обстановка) появятся
// на этапе 8б, тогда же — «где используется» перед удалением.
@Injectable()
export class VoxelModelsService extends CatalogEntriesService<
  VoxelModelVariant,
  VoxelModelDto
> {
  constructor(
    private readonly database: DatabaseService,
    @InjectPinoLogger(VoxelModelsService.name)
    private readonly log: PinoLogger,
  ) {
    super(database, log, VOXEL_MODELS_CONFIG);
  }

  // Ссылка копии на оригинал: виден ли он и обновлялся ли.
  protected override attachLinks = (
    userId: string,
    entries: (VoxelModelVariant & CatalogEntryFields)[],
  ) => attachOrigins(this.database, voxelModels, this.log, userId, entries);
}
