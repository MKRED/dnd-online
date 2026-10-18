import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CatalogEntriesService } from '../catalog/entries/catalog-entries.service.js';
import {
  DatabaseService,
  type DbTransaction,
} from '../database/database.service.js';
import type { EffectDto } from './dto/effect.dto.js';
import { EffectAbilitiesService } from './effect-abilities.service.js';
import { EFFECTS_CONFIG, type EffectRecordFields } from './effects.config.js';

@Injectable()
export class EffectsService extends CatalogEntriesService<
  EffectRecordFields,
  EffectDto
> {
  constructor(
    databaseService: DatabaseService,
    @InjectPinoLogger(EffectsService.name) logger: PinoLogger,
    private readonly effectAbilities: EffectAbilitiesService,
  ) {
    super(databaseService, logger, EFFECTS_CONFIG);
  }

  // Скрыть вместе с эффектом свои опубликованные способности, которые его накладывают.
  protected override writeLinks = async (
    tx: DbTransaction,
    userId: string,
    effectId: string,
    dto: EffectDto,
  ) => {
    if (!dto.isPublic && dto.hideAbilities)
      await this.effectAbilities.hideOwnAbilities(tx, userId, effectId);
  };

  // Какие способности накладывают эффект — только автору и только в карточке.
  protected override attachLinks = async (
    userId: string,
    entries: (EffectRecordFields & { id: string; authorId: string })[],
    detail: boolean,
  ) => {
    if (!detail) return;
    for (const effect of entries)
      if (effect.authorId === userId)
        effect.abilities = await this.effectAbilities.abilitiesOf(
          userId,
          effect.id,
        );
  };
}
