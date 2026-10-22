import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CatalogImageFilesService } from '../catalog/images/catalog-image-files.service.js';
import { DatabaseService } from '../database/database.service.js';
import { BLOCK_GROUP_IMAGE_CONFIG } from './block-groups.config.js';

@Injectable()
export class BlockGroupImagesService extends CatalogImageFilesService {
  constructor(
    databaseService: DatabaseService,
    @InjectPinoLogger(BlockGroupImagesService.name) logger: PinoLogger,
  ) {
    super(databaseService, logger, BLOCK_GROUP_IMAGE_CONFIG);
  }
}
