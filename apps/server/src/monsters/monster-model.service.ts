import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { ModelMeshFormat } from 'shared';
import { visibleEntry } from '../catalog/catalog-access.js';
import { DatabaseService } from '../database/database.service.js';
import { monsters, voxelModelMeshes } from '../database/schema/index.js';
import { MONSTER_ACCESS } from './monsters.config.js';

// Байты загруженного файла модели монстра (docs/plan/done/monster-models.md): их получает
// всякий, кто видит монстра, даже если сама модель у автора скрыта — как вид модели в
// карточке. id модели в адресе сверяется со ссылкой монстра: клиент кеширует ответ
// навсегда, и у сменившего модель монстра старый адрес не должен отдать новый файл.
@Injectable()
export class MonsterModelService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(MonsterModelService.name)
    private readonly logger: PinoLogger,
  ) {}

  async file(
    userId: string,
    monsterId: string,
    modelId: string,
  ): Promise<{ data: Buffer; format: ModelMeshFormat }> {
    const t0 = Date.now();
    try {
      const [row] = await this.databaseService.db
        .select({
          data: voxelModelMeshes.data,
          format: voxelModelMeshes.format,
        })
        .from(monsters)
        .innerJoin(voxelModelMeshes, eq(voxelModelMeshes.modelId, modelId))
        .where(
          and(
            visibleEntry(MONSTER_ACCESS, userId, monsterId),
            sql`${monsters.extra} -> 'model' ->> 'id' = ${modelId}`,
          ),
        )
        .limit(1);
      if (!row)
        throw new NotFoundException('У монстра нет такой модели с файлом');
      this.logger.debug(
        {
          durationMs: Date.now() - t0,
          userId,
          monsterId,
          modelId,
          bytes: row.data.length,
        },
        'Monster model file read',
      );
      return row;
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, durationMs: Date.now() - t0, userId, monsterId, modelId },
        'Monster model file read failed',
      );
      throw err;
    }
  }
}
