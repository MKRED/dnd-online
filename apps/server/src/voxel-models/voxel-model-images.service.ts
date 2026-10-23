import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CatalogImageFilesService } from '../catalog/images/catalog-image-files.service.js';
import { DatabaseService } from '../database/database.service.js';
import { VOXEL_MODEL_IMAGE_CONFIG } from './voxel-models.config.js';

@Injectable()
export class VoxelModelImagesService extends CatalogImageFilesService {
  constructor(
    databaseService: DatabaseService,
    @InjectPinoLogger(VoxelModelImagesService.name) logger: PinoLogger,
  ) {
    super(databaseService, logger, VOXEL_MODEL_IMAGE_CONFIG);
  }
}
