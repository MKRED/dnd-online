import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { CatalogEntryFields, MonsterRecordFields } from 'shared';
import { CatalogEntriesService } from '../catalog/entries/catalog-entries.service.js';
import { DatabaseService } from '../database/database.service.js';
import { loadMonsterAbilities } from './abilities/index.js';
import { loadMonsterEffects } from './effects/index.js';
import { loadMonsterItems } from './items/index.js';
import type { MonsterDto } from './dto/monster.dto.js';
import { MONSTERS_CONFIG } from './monsters.config.js';

@Injectable()
export class MonstersService extends CatalogEntriesService<
  MonsterRecordFields,
  MonsterDto
> {
  constructor(
    // Своё имя: databaseService — приватное поле базового класса.
    private readonly database: DatabaseService,
    @InjectPinoLogger(MonstersService.name) logger: PinoLogger,
  ) {
    super(database, logger, MONSTERS_CONFIG);
  }

  // Способности, снаряжение и эффекты — только в карточке и любому, кто её видит:
  // скрытые от смотрящего приходят заглушками.
  protected override attachLinks = async (
    userId: string,
    entries: (MonsterRecordFields & CatalogEntryFields)[],
    detail: boolean,
  ) => {
    if (!detail) return;
    const { db } = this.database;
    for (const monster of entries)
      [monster.abilities, monster.items, monster.effects] = await Promise.all([
        loadMonsterAbilities(db, userId, monster.id),
        loadMonsterItems(db, userId, monster.id),
        loadMonsterEffects(db, userId, monster.id),
      ]);
  };
}
