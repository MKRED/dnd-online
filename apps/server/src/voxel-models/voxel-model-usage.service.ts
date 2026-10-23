import { Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, or, sql } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { VoxelModelUsage } from 'shared';
import { authoredEntry } from '../catalog/catalog-access.js';
import { DatabaseService } from '../database/database.service.js';
import { furniture, voxelModels } from '../database/schema/index.js';
import { VOXEL_MODEL_ACCESS } from './voxel-models.config.js';

// Где стоит модель (docs/plan/blocks.md, этапы 8б и 8г): обстановка автора с этой моделью
// — своей или одного из положений — для вопроса перед удалением. Чужой обстановки с ней
// не бывает: модель в обстановке только своя.
@Injectable()
export class VoxelModelUsageService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(VoxelModelUsageService.name)
    private readonly logger: PinoLogger,
  ) {}

  async usage(userId: string, id: string): Promise<VoxelModelUsage> {
    const t0 = Date.now();
    const { db } = this.databaseService;
    try {
      const [own] = await db
        .select({ id: voxelModels.id })
        .from(voxelModels)
        .where(authoredEntry(VOXEL_MODEL_ACCESS, userId, id));
      if (!own) throw new NotFoundException(VOXEL_MODEL_ACCESS.notFound);
      const rows = await db
        .select({ id: furniture.id, name: furniture.name })
        .from(furniture)
        .where(
          and(
            eq(furniture.authorId, userId),
            or(
              sql`${furniture.extra}->>'modelId' = ${id}`,
              sql`${furniture.extra}->'positions' @> ${JSON.stringify([{ modelId: id }])}::jsonb`,
            ),
          ),
        )
        .orderBy(furniture.name);
      this.logger.debug(
        {
          durationMs: Date.now() - t0,
          userId,
          entryId: id,
          furniture: rows.length,
        },
        'Voxel model usage listed',
      );
      return { furniture: rows };
    } catch (err: unknown) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error(
        { err, durationMs: Date.now() - t0, userId, entryId: id },
        'Voxel model usage failed',
      );
      throw err;
    }
  }
}
