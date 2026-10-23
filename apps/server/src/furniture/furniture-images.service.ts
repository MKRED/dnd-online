import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CatalogImageFilesService } from '../catalog/images/catalog-image-files.service.js';
import { DatabaseService } from '../database/database.service.js';
import { FURNITURE_IMAGE_CONFIG } from './furniture.config.js';

@Injectable()
export class FurnitureImagesService extends CatalogImageFilesService {
  constructor(
    databaseService: DatabaseService,
    @InjectPinoLogger(FurnitureImagesService.name) logger: PinoLogger,
  ) {
    super(databaseService, logger, FURNITURE_IMAGE_CONFIG);
  }
}
