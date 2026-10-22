import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CatalogImageEditService } from '../catalog/images/catalog-image-edit.service.js';
import { DatabaseService } from '../database/database.service.js';
import { BLOCK_GROUP_IMAGE_CONFIG } from './block-groups.config.js';

@Injectable()
export class BlockGroupImageEditService extends CatalogImageEditService {
  constructor(
    databaseService: DatabaseService,
    @InjectPinoLogger(BlockGroupImageEditService.name) logger: PinoLogger,
  ) {
    super(databaseService, logger, BLOCK_GROUP_IMAGE_CONFIG);
  }
}
