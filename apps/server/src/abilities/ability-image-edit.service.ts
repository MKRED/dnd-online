import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CatalogImageEditService } from '../catalog/images/catalog-image-edit.service.js';
import { DatabaseService } from '../database/database.service.js';
import { ABILITY_IMAGE_CONFIG } from './abilities.config.js';

@Injectable()
export class AbilityImageEditService extends CatalogImageEditService {
  constructor(
    databaseService: DatabaseService,
    @InjectPinoLogger(AbilityImageEditService.name) logger: PinoLogger,
  ) {
    super(databaseService, logger, ABILITY_IMAGE_CONFIG);
  }
}
