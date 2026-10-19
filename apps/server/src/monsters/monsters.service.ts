import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { MonsterFields } from 'shared';
import { CatalogEntriesService } from '../catalog/entries/catalog-entries.service.js';
import { DatabaseService } from '../database/database.service.js';
import type { MonsterDto } from './dto/monster.dto.js';
import { MONSTERS_CONFIG } from './monsters.config.js';

// Связей со способностями, снаряжением и эффектами пока нет (этапы 5–6).
@Injectable()
export class MonstersService extends CatalogEntriesService<
  MonsterFields,
  MonsterDto
> {
  constructor(
    databaseService: DatabaseService,
    @InjectPinoLogger(MonstersService.name) logger: PinoLogger,
  ) {
    super(databaseService, logger, MONSTERS_CONFIG);
  }
}
