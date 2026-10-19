import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CatalogImageFilesService } from '../catalog/images/catalog-image-files.service.js';
import { DatabaseService } from '../database/database.service.js';
import { MONSTER_IMAGE_CONFIG } from './monsters.config.js';

@Injectable()
export class MonsterImagesService extends CatalogImageFilesService {
  constructor(
    databaseService: DatabaseService,
    @InjectPinoLogger(MonsterImagesService.name) logger: PinoLogger,
  ) {
    super(databaseService, logger, MONSTER_IMAGE_CONFIG);
  }
}
