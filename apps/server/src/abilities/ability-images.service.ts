import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CatalogImageFilesService } from '../catalog/images/catalog-image-files.service.js';
import { DatabaseService } from '../database/database.service.js';
import { ABILITY_IMAGE_CONFIG } from './abilities.config.js';

@Injectable()
export class AbilityImagesService extends CatalogImageFilesService {
  constructor(
    databaseService: DatabaseService,
    @InjectPinoLogger(AbilityImagesService.name) logger: PinoLogger,
  ) {
    super(databaseService, logger, ABILITY_IMAGE_CONFIG);
  }
}
