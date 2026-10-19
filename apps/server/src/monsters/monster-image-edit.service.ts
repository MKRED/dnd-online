import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CatalogImageEditService } from '../catalog/images/catalog-image-edit.service.js';
import { DatabaseService } from '../database/database.service.js';
import { MONSTER_IMAGE_CONFIG } from './monsters.config.js';

@Injectable()
export class MonsterImageEditService extends CatalogImageEditService {
  constructor(
    databaseService: DatabaseService,
    @InjectPinoLogger(MonsterImageEditService.name) logger: PinoLogger,
  ) {
    super(databaseService, logger, MONSTER_IMAGE_CONFIG);
  }
}
