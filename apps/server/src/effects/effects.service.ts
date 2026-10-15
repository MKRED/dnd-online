import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CatalogEntriesService } from '../catalog/entries/catalog-entries.service.js';
import { DatabaseService } from '../database/database.service.js';
import type { EffectDto } from './dto/effect.dto.js';
import type { EffectFields } from 'shared';
import { EFFECTS_CONFIG } from './effects.config.js';

@Injectable()
export class EffectsService extends CatalogEntriesService<
  EffectFields,
  EffectDto
> {
  constructor(
    databaseService: DatabaseService,
    @InjectPinoLogger(EffectsService.name) logger: PinoLogger,
  ) {
    super(databaseService, logger, EFFECTS_CONFIG);
  }
}
