import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { readCatalogOrigin } from 'shared';
import {
  CatalogCopyService,
  contentOf,
  originOf,
} from '../catalog/copies/catalog-copy.service.js';
import {
  DatabaseService,
  type DbTransaction,
} from '../database/database.service.js';
import { furniture, users, voxelModels } from '../database/schema/index.js';
import { FURNITURE_ACCESS } from './furniture.config.js';
import { FurnitureService } from './furniture.service.js';

type EntryRow = typeof furniture.$inferSelect;

// Копирование чужой обстановки и «Подтянуть обновления» (docs/plan/blocks.md, этап 8б):
// в обстановке — только своя модель, поэтому вместе с записью копируется и модель
// оригинала (своя копия модели со ссылкой на автора), а обновление подтягивает и её.
@Injectable()
export class FurnitureCopyService extends CatalogCopyService<
  Awaited<ReturnType<FurnitureService['findOne']>>
> {
  constructor(
    databaseService: DatabaseService,
    entries: FurnitureService,
    @InjectPinoLogger(FurnitureCopyService.name)
    private readonly log: PinoLogger,
  ) {
    super(
      databaseService,
      log,
      {
        catalog: 'furniture',
        table: furniture,
        access: FURNITURE_ACCESS,
        ownEntry: 'Это ваша обстановка — копировать её не нужно',
        notCopy: 'Эта обстановка не копия — обновлять её не из чего',
      },
      (userId, id) => entries.findOne(userId, id),
    );
  }

  protected override adaptExtra = async (
    tx: DbTransaction,
    userId: string,
    source: EntryRow,
    copy: EntryRow | null,
  ): Promise<Record<string, unknown>> => {
    const sourceModelId = source.extra.modelId;
    if (typeof sourceModelId !== 'string') return {};
    const [found] = await tx
      .select({ model: voxelModels, authorNickname: users.nickname })
      .from(voxelModels)
      .innerJoin(users, eq(users.id, voxelModels.authorId))
      .where(eq(voxelModels.id, sourceModelId));
    // Модель оригинала удалена — у копии тоже нет вида: ссылка читается как null.
    if (!found) return { modelId: sourceModelId };
    const { model, authorNickname } = found;
    const origin = originOf(model, authorNickname);
    // Прежняя копия модели — своя и скопирована с той же модели: обновляем её на месте.
    const previousId = copy?.extra.modelId;
    if (typeof previousId === 'string') {
      const [previous] = await tx
        .select()
        .from(voxelModels)
        .where(eq(voxelModels.id, previousId));
      if (
        previous?.authorId === userId &&
        readCatalogOrigin(previous.extra)?.id === model.id
      ) {
        await tx
          .update(voxelModels)
          .set(contentOf(model, origin))
          .where(eq(voxelModels.id, previous.id));
        this.log.info(
          { userId, modelId: previous.id },
          'Furniture model pulled from origin',
        );
        return { modelId: previous.id };
      }
    }
    const [inserted] = await tx
      .insert(voxelModels)
      .values({
        authorId: userId,
        name: model.name,
        description: model.description,
        sources: model.sources,
        isPublic: false,
        ...contentOf(model, origin),
      })
      .returning({ id: voxelModels.id });
    this.log.info(
      { userId, sourceModelId: model.id, modelId: inserted.id },
      'Furniture model copied',
    );
    return { modelId: inserted.id };
  };
}
