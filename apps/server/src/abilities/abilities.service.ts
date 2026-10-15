import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CatalogEntriesService } from '../catalog/entries/catalog-entries.service.js';
import { DatabaseService } from '../database/database.service.js';
import {
  ABILITIES_CONFIG,
  type AbilityRecordFields,
} from './abilities.config.js';
import type { AbilityDto } from './dto/ability.dto.js';

@Injectable()
export class AbilitiesService extends CatalogEntriesService<
  AbilityRecordFields,
  AbilityDto
> {
  constructor(
    databaseService: DatabaseService,
    @InjectPinoLogger(AbilitiesService.name) logger: PinoLogger,
  ) {
    super(databaseService, logger, ABILITIES_CONFIG);
  }
}
