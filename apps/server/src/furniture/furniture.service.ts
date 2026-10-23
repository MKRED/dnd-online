import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  checkFurniturePositions,
  furnitureModelIds,
  type CatalogEntryFields,
} from 'shared';
import { attachOrigins } from '../catalog/copies/catalog-origins.js';
import { CatalogEntriesService } from '../catalog/entries/catalog-entries.service.js';
import {
  DatabaseService,
  type DbTransaction,
} from '../database/database.service.js';
import { furniture, voxelModels } from '../database/schema/index.js';
import type { FurnitureDto } from './dto/furniture.dto.js';
import { FURNITURE_CONFIG, type FurnitureVariant } from './furniture.config.js';
import { markModelUpdates } from './furniture-model-updates.js';
import { areOwnModels, loadFurnitureModels } from './furniture-models.js';

// Обстановка (docs/plan/blocks.md, этап 8б): запись роли ссылается на свою модель.
// Удалённая модель читается как null — обстановка остаётся без вида.
@Injectable()
export class FurnitureService extends CatalogEntriesService<
  FurnitureVariant,
  FurnitureDto
> {
  constructor(
    private readonly database: DatabaseService,
    @InjectPinoLogger(FurnitureService.name)
    private readonly log: PinoLogger,
  ) {
    super(database, log, FURNITURE_CONFIG);
  }

  // Модели — только свои, и у положений тоже: чужую сначала копируют, как блоки. В
  // транзакции записи — отказ откатывает её целиком.
  protected override writeLinks = async (
    tx: DbTransaction,
    userId: string,
    _entryId: string,
    dto: FurnitureDto,
  ) => {
    const wrong = checkFurniturePositions(dto);
    if (wrong) throw new BadRequestException(wrong);
    if (!(await areOwnModels(tx, userId, furnitureModelIds(dto))))
      throw new BadRequestException(
        'Модель не найдена среди ваших: чужую модель сначала скопируйте себе',
      );
  };

  // Модели целиком (основная и положений) и ссылки копий на оригиналы — у обстановки и у
  // её моделей; копия обстановки «обновлена» и после правки одной только модели
  // (markModelUpdates).
  protected override attachLinks = async (
    userId: string,
    entries: (FurnitureVariant & CatalogEntryFields)[],
  ) => {
    const t0 = Date.now();
    const models = await loadFurnitureModels(
      this.database.db,
      entries.flatMap(furnitureModelIds).filter(Boolean),
    );
    for (const entry of entries) {
      entry.model = models.get(entry.modelId) ?? null;
      for (const id of furnitureModelIds(entry)) {
        const model = models.get(id);
        if (model) entry.models[id] = model;
      }
    }
    await attachOrigins(this.database, furniture, this.log, userId, entries);
    await attachOrigins(this.database, voxelModels, this.log, userId, [
      ...models.values(),
    ]);
    await markModelUpdates(this.database.db, entries);
    this.log.debug(
      {
        durationMs: Date.now() - t0,
        count: entries.length,
        models: models.size,
      },
      'Furniture models attached',
    );
  };
}
