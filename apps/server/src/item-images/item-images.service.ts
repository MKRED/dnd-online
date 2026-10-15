import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CatalogImageFilesService } from '../catalog/images/catalog-image-files.service.js';
import { DatabaseService } from '../database/database.service.js';
import { ITEM_IMAGE_CONFIG } from './item-image.config.js';

// Отдача картинки предмета — общая для каталогов (CatalogImageFilesService).
@Injectable()
export class ItemImagesService extends CatalogImageFilesService {
  constructor(
    databaseService: DatabaseService,
    @InjectPinoLogger(ItemImagesService.name) logger: PinoLogger,
  ) {
    super(databaseService, logger, ITEM_IMAGE_CONFIG);
  }
}
