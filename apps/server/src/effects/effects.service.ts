import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { EffectVariant } from 'shared';
import { CatalogEntriesService } from '../catalog/entries/catalog-entries.service.js';
import { DatabaseService } from '../database/database.service.js';
import { EFFECTS_CONFIG } from './effects.config.js';

@Injectable()
export class EffectsService extends CatalogEntriesService<EffectVariant> {
  constructor(
    databaseService: DatabaseService,
    @InjectPinoLogger(EffectsService.name) logger: PinoLogger,
  ) {
    super(databaseService, logger, EFFECTS_CONFIG);
  }
}
