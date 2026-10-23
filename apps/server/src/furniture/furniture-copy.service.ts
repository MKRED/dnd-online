import { Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  furnitureModelIds,
  readCatalogOrigin,
  readFurniturePositions,
} from 'shared';
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
import { copyModelMesh } from '../voxel-models/mesh/model-mesh-files.js';
import { FURNITURE_ACCESS } from './furniture.config.js';
import { FurnitureService } from './furniture.service.js';

type EntryRow = typeof furniture.$inferSelect;

// Копирование чужой обстановки и «Подтянуть обновления» (docs/plan/blocks.md, этапы 8б
// и 8г): в обстановке — только свои модели, поэтому вместе с записью копируются и модели
// оригинала — основная и всех положений (свои копии со ссылкой на автора), а обновление
// подтягивает и их.
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
    if (typeof source.extra.modelId !== 'string') return {};
    const fields = {
      modelId: source.extra.modelId,
      positions: readFurniturePositions(source.extra.positions),
    };
    // Прежние копии моделей — по id оригинала, с которого скопированы.
    const previous = await this.previousModels(tx, userId, copy);
    const copied = new Map<string, string>();
    for (const sourceId of furnitureModelIds(fields))
      copied.set(
        sourceId,
        await this.copyModel(tx, userId, sourceId, previous.get(sourceId)),
      );
    const idOf = (id: string) => copied.get(id) ?? id;
    return {
      modelId: idOf(fields.modelId),
      positions: fields.positions.map(({ name, modelId }) => ({
        name,
        modelId: idOf(modelId),
      })),
    };
  };

  // Свои копии моделей прежней копии обстановки: оригинал модели → id копии.
  private async previousModels(
    tx: DbTransaction,
    userId: string,
    copy: EntryRow | null,
  ): Promise<Map<string, string>> {
    const ids =
      copy && typeof copy.extra.modelId === 'string'
        ? furnitureModelIds({
            modelId: copy.extra.modelId,
            positions: readFurniturePositions(copy.extra.positions),
          })
        : [];
    if (!ids.length) return new Map();
    const rows = await tx
      .select({ id: voxelModels.id, extra: voxelModels.extra })
      .from(voxelModels)
      .where(
        and(inArray(voxelModels.id, ids), eq(voxelModels.authorId, userId)),
      );
    const found = new Map<string, string>();
    for (const row of rows) {
      const origin = readCatalogOrigin(row.extra);
      if (origin) found.set(origin.id, row.id);
    }
    return found;
  }

  // Модель оригинала — в свою копию: прежняя копия обновляется на месте, иначе
  // создаётся новая. Модель оригинала удалена — ссылка остаётся и читается как null.
  private async copyModel(
    tx: DbTransaction,
    userId: string,
    sourceId: string,
    previousId: string | undefined,
  ): Promise<string> {
    const [found] = await tx
      .select({ model: voxelModels, authorNickname: users.nickname })
      .from(voxelModels)
      .innerJoin(users, eq(users.id, voxelModels.authorId))
      .where(eq(voxelModels.id, sourceId));
    if (!found) return sourceId;
    const { model, authorNickname } = found;
    const origin = originOf(model, authorNickname);
    if (previousId) {
      await tx
        .update(voxelModels)
        .set(contentOf(model, origin))
        .where(eq(voxelModels.id, previousId));
      await copyModelMesh(tx, model.id, previousId);
      this.log.info(
        { userId, modelId: previousId },
        'Furniture model pulled from origin',
      );
      return previousId;
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
    await copyModelMesh(tx, model.id, inserted.id);
    this.log.info(
      { userId, sourceModelId: model.id, modelId: inserted.id },
      'Furniture model copied',
    );
    return inserted.id;
  }
}
