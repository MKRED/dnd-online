import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CatalogCopyService } from '../catalog/copies/catalog-copy.service.js';
import { DatabaseService } from '../database/database.service.js';
import { voxelModels } from '../database/schema/index.js';
import { VOXEL_MODEL_ACCESS } from './voxel-models.config.js';
import { VoxelModelsService } from './voxel-models.service.js';

// Копирование чужих моделей и «Подтянуть обновления» — как у групп блоков
// (docs/plan/blocks.md, этапы 6б и 8а).
@Injectable()
export class VoxelModelCopyService extends CatalogCopyService<
  Awaited<ReturnType<VoxelModelsService['findOne']>>
> {
  constructor(
    databaseService: DatabaseService,
    models: VoxelModelsService,
    @InjectPinoLogger(VoxelModelCopyService.name)
    logger: PinoLogger,
  ) {
    super(
      databaseService,
      logger,
      {
        catalog: 'voxelModel',
        table: voxelModels,
        access: VOXEL_MODEL_ACCESS,
        ownEntry: 'Это ваша модель — копировать её не нужно',
        notCopy: 'Эта модель не копия — обновлять её не из чего',
      },
      (userId, id) => models.findOne(userId, id),
    );
  }
}
