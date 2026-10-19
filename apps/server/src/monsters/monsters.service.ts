import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { CatalogEntryFields, MonsterRecordFields } from 'shared';
import { CatalogEntriesService } from '../catalog/entries/catalog-entries.service.js';
import { DatabaseService } from '../database/database.service.js';
import { loadMonsterAbilities } from './abilities/index.js';
import type { MonsterDto } from './dto/monster.dto.js';
import { MONSTERS_CONFIG } from './monsters.config.js';

// Снаряжения и эффектов пока нет (этап 6).
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

  // Способности — только в карточке и любому, кто её видит: скрытые от смотрящего
  // приходят заглушками.
  protected override attachLinks = async (
    userId: string,
    entries: (MonsterRecordFields & CatalogEntryFields)[],
    detail: boolean,
  ) => {
    if (!detail) return;
    for (const monster of entries)
      monster.abilities = await loadMonsterAbilities(
        this.database.db,
        userId,
        monster.id,
      );
  };
}
