import {
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  defaultMeshFit,
  detectModelFormat,
  isModelMesh,
  STL_DEFAULT_COLOR,
  type ModelMesh,
  type ModelMeshFormat,
} from 'shared';
import {
  lockAuthoredEntry,
  visibleEntry,
} from '../../catalog/catalog-access.js';
import {
  DatabaseService,
  type DbTransaction,
} from '../../database/database.service.js';
import { voxelModelMeshes, voxelModels } from '../../database/schema/index.js';
import { VOXEL_MODEL_ACCESS } from '../voxel-models.config.js';
import type { PatchModelMeshDto } from './dto/patch-model-mesh.dto.js';

const NO_MESH = 'У модели нет загруженного файла';

// Загруженный файл модели (docs/plan/blocks.md, этап 9). Файл видит тот, кто видит модель
// (автор или все — у опубликованной); загружать, править и убирать — автор. Что нарисовать
// и как вписать, лежит в extra.mesh записи: так его получает всё, что читает модель
// (обстановка, карта, сцена). Воксели для правил считает клиент и сохраняет записью.
@Injectable()
export class VoxelModelMeshService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(VoxelModelMeshService.name)
    private readonly logger: PinoLogger,
  ) {}

  file(
    userId: string,
    modelId: string,
  ): Promise<{ data: Buffer; format: ModelMeshFormat }> {
    return this.run('file', { userId, modelId }, async () => {
      const { db } = this.databaseService;
      const [row] = await db
        .select({
          data: voxelModelMeshes.data,
          format: voxelModelMeshes.format,
        })
        .from(voxelModelMeshes)
        .innerJoin(voxelModels, eq(voxelModels.id, voxelModelMeshes.modelId))
        .where(visibleEntry(VOXEL_MODEL_ACCESS, userId, modelId))
        .limit(1);
      if (!row) throw new NotFoundException(NO_MESH);
      return row;
    });
  }

  // Новый файл заменяет прежний; цвет и вписывание — по умолчанию для его формата.
  upload(userId: string, modelId: string, data: Buffer): Promise<ModelMesh> {
    return this.run('upload', { userId, modelId }, async () => {
      const format = detectModelFormat(data);
      if (!format)
        throw new BadRequestException(
          'Не удалось распознать модель. Подойдут .glb и STL',
        );
      return this.databaseService.db.transaction(async (tx) => {
        const previous = await this.lockedMesh(tx, userId, modelId);
        const values = {
          format,
          size: data.length,
          data,
          updatedAt: new Date(),
        };
        await tx
          .insert(voxelModelMeshes)
          .values({ modelId, ...values })
          .onConflictDoUpdate({
            target: voxelModelMeshes.modelId,
            set: values,
          });
        return this.writeMesh(tx, modelId, {
          format,
          version: (previous?.version ?? 0) + 1,
          color: format === 'stl' ? STL_DEFAULT_COLOR : null,
          fit: defaultMeshFit(format),
        });
      });
    });
  }

  patch(
    userId: string,
    modelId: string,
    dto: PatchModelMeshDto,
  ): Promise<ModelMesh> {
    return this.run('patch', { userId, modelId }, () =>
      this.databaseService.db.transaction(async (tx) => {
        const mesh = await this.lockedMesh(tx, userId, modelId);
        if (!mesh) throw new NotFoundException(NO_MESH);
        if (dto.color !== undefined && mesh.format !== 'stl')
          throw new BadRequestException(
            'Цвет задаётся только у модели STL: у .glb свои цвета',
          );
        return this.writeMesh(tx, modelId, {
          ...mesh,
          ...(dto.color !== undefined && { color: dto.color.toLowerCase() }),
          ...(dto.fit && { fit: dto.fit }),
        });
      }),
    );
  }

  // Воксели, посчитанные из файла, остаются: модель становится обычной воксельной.
  remove(userId: string, modelId: string): Promise<void> {
    return this.run('remove', { userId, modelId }, () =>
      this.databaseService.db.transaction(async (tx) => {
        const mesh = await this.lockedMesh(tx, userId, modelId);
        if (!mesh) throw new NotFoundException(NO_MESH);
        await tx
          .delete(voxelModelMeshes)
          .where(eq(voxelModelMeshes.modelId, modelId));
        await this.writeMesh(tx, modelId, null);
      }),
    );
  }

  // Файл своей модели под блокировкой строки: две загрузки подряд не перемешаются.
  private async lockedMesh(
    tx: DbTransaction,
    userId: string,
    modelId: string,
  ): Promise<ModelMesh | null> {
    await lockAuthoredEntry(tx, VOXEL_MODEL_ACCESS, userId, modelId);
    const [row] = await tx
      .select({ extra: voxelModels.extra })
      .from(voxelModels)
      .where(eq(voxelModels.id, modelId));
    return isModelMesh(row?.extra.mesh) ? row.extra.mesh : null;
  }

  private async writeMesh<T extends ModelMesh | null>(
    tx: DbTransaction,
    modelId: string,
    mesh: T,
  ): Promise<T> {
    const [row] = await tx
      .select({ extra: voxelModels.extra })
      .from(voxelModels)
      .where(eq(voxelModels.id, modelId));
    const rest = { ...row.extra };
    delete rest.mesh;
    await tx
      .update(voxelModels)
      .set({
        extra: mesh ? { ...rest, mesh } : rest,
        updatedAt: new Date(),
      })
      .where(eq(voxelModels.id, modelId));
    return mesh;
  }

  // Ошибки запроса (404, 400) — ожидаемые, их не пишем в лог ошибкой.
  private async run<T>(
    action: string,
    context: { userId: string; modelId: string },
    work: () => Promise<T>,
  ): Promise<T> {
    const t0 = Date.now();
    try {
      const result = await work();
      this.logger.info(
        { ...context, action, durationMs: Date.now() - t0 },
        'Voxel model mesh request done',
      );
      return result;
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, ...context, action },
        'Voxel model mesh request failed',
      );
      throw err;
    }
  }
}
