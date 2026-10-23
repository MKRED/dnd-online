import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CatalogImageEditService } from '../catalog/images/catalog-image-edit.service.js';
import { DatabaseService } from '../database/database.service.js';
import { VOXEL_MODEL_IMAGE_CONFIG } from './voxel-models.config.js';

@Injectable()
export class VoxelModelImageEditService extends CatalogImageEditService {
  constructor(
    databaseService: DatabaseService,
    @InjectPinoLogger(VoxelModelImageEditService.name) logger: PinoLogger,
  ) {
    super(databaseService, logger, VOXEL_MODEL_IMAGE_CONFIG);
  }
}
