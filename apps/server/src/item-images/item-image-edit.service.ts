import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CatalogImageEditService } from '../catalog/images/catalog-image-edit.service.js';
import { DatabaseService } from '../database/database.service.js';
import { ITEM_IMAGE_CONFIG } from './item-image.config.js';

// Правки картинки предмета — общие для каталогов (CatalogImageEditService).
@Injectable()
export class ItemImageEditService extends CatalogImageEditService {
  constructor(
    databaseService: DatabaseService,
    @InjectPinoLogger(ItemImageEditService.name) logger: PinoLogger,
  ) {
    super(databaseService, logger, ITEM_IMAGE_CONFIG);
  }
}
