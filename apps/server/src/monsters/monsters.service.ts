import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { CatalogEntryFields, MonsterRecordFields } from 'shared';
import { CatalogEntriesService } from '../catalog/entries/catalog-entries.service.js';
import {
  DatabaseService,
  type DbTransaction,
} from '../database/database.service.js';
import { areOwnModels } from '../furniture/furniture-models.js';
import { loadMonsterAbilities } from './abilities/index.js';
import { loadMonsterEffects } from './effects/index.js';
import { loadMonsterItems } from './items/index.js';
import { attachMonsterModelViews } from './monster-model-view.js';
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

  // Модель — только своя, как у обстановки (docs/plan/done/monster-models.md). Нет поля —
  // ссылка прежняя, её не проверяем: она уже была проверена при записи.
  protected override writeLinks = async (
    tx: DbTransaction,
    userId: string,
    _entryId: string,
    dto: MonsterDto,
  ) => {
    if (dto.model && !(await areOwnModels(tx, userId, [dto.model.id])))
      throw new BadRequestException(
        'Модель не найдена среди ваших: чужую модель сначала скопируйте себе в «Модели»',
      );
  };

  // Способности, снаряжение, эффекты и вид модели — только в карточке и любому, кто её
  // видит: скрытые от смотрящего способности и прочее приходят заглушками.
  protected override attachLinks = async (
    userId: string,
    entries: (MonsterRecordFields & CatalogEntryFields)[],
    detail: boolean,
  ) => {
    if (!detail) return;
    const { db } = this.database;
    await attachMonsterModelViews(db, userId, entries);
    for (const monster of entries)
      [monster.abilities, monster.items, monster.effects] = await Promise.all([
        loadMonsterAbilities(db, userId, monster.id),
        loadMonsterItems(db, userId, monster.id),
        loadMonsterEffects(db, userId, monster.id),
      ]);
  };
}
