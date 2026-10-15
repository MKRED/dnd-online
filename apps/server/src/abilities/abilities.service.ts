import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { AbilityVariant } from 'shared';
import { CatalogEntriesService } from '../catalog/entries/catalog-entries.service.js';
import { DatabaseService } from '../database/database.service.js';
import { ABILITIES_CONFIG } from './abilities.config.js';

@Injectable()
export class AbilitiesService extends CatalogEntriesService<AbilityVariant> {
  constructor(
    databaseService: DatabaseService,
    @InjectPinoLogger(AbilitiesService.name) logger: PinoLogger,
  ) {
    super(databaseService, logger, ABILITIES_CONFIG);
  }
}
