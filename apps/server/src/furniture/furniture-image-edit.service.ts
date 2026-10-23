import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CatalogImageEditService } from '../catalog/images/catalog-image-edit.service.js';
import { DatabaseService } from '../database/database.service.js';
import { FURNITURE_IMAGE_CONFIG } from './furniture.config.js';

@Injectable()
export class FurnitureImageEditService extends CatalogImageEditService {
  constructor(
    databaseService: DatabaseService,
    @InjectPinoLogger(FurnitureImageEditService.name) logger: PinoLogger,
  ) {
    super(databaseService, logger, FURNITURE_IMAGE_CONFIG);
  }
}
