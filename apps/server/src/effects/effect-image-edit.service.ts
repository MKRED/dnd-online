import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CatalogImageEditService } from '../catalog/images/catalog-image-edit.service.js';
import { DatabaseService } from '../database/database.service.js';
import { EFFECT_IMAGE_CONFIG } from './effects.config.js';

@Injectable()
export class EffectImageEditService extends CatalogImageEditService {
  constructor(
    databaseService: DatabaseService,
    @InjectPinoLogger(EffectImageEditService.name) logger: PinoLogger,
  ) {
    super(databaseService, logger, EFFECT_IMAGE_CONFIG);
  }
}
