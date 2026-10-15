import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CatalogImageFilesService } from '../catalog/images/catalog-image-files.service.js';
import { DatabaseService } from '../database/database.service.js';
import { EFFECT_IMAGE_CONFIG } from './effects.config.js';

@Injectable()
export class EffectImagesService extends CatalogImageFilesService {
  constructor(
    databaseService: DatabaseService,
    @InjectPinoLogger(EffectImagesService.name) logger: PinoLogger,
  ) {
    super(databaseService, logger, EFFECT_IMAGE_CONFIG);
  }
}
