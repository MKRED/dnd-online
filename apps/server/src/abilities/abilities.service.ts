import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CatalogEntriesService } from '../catalog/entries/catalog-entries.service.js';
import { DatabaseService } from '../database/database.service.js';
import {
  ABILITIES_CONFIG,
  type AbilityRecordFields,
} from './abilities.config.js';
import type { AbilityDto } from './dto/ability.dto.js';
import { StepEffectsService } from './step-effects/index.js';

// Способности на общем коде каталогов; свои у них только эффекты в шагах (этап 8) —
// отдельная таблица, которую пишет и читает StepEffectsService.
@Injectable()
export class AbilitiesService extends CatalogEntriesService<
  AbilityRecordFields,
  AbilityDto
> {
  constructor(
    databaseService: DatabaseService,
    @InjectPinoLogger(AbilitiesService.name) logger: PinoLogger,
    private readonly stepEffects: StepEffectsService,
  ) {
    super(databaseService, logger, ABILITIES_CONFIG);
  }

  protected override writeLinks = (
    tx: Parameters<StepEffectsService['replace']>[0],
    userId: string,
    abilityId: string,
    dto: AbilityDto,
  ) =>
    this.stepEffects.replace(tx, userId, abilityId, dto.steps ?? [], {
      isPublic: dto.isPublic,
      publishEffects: dto.publishEffects ?? false,
    });

  protected override attachLinks = (
    userId: string,
    entries: Parameters<StepEffectsService['attach']>[1],
  ) => this.stepEffects.attach(userId, entries);
}
