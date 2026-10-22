import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  createBlockCatalog,
  type BlockCatalog,
  type BlockGroupInfo,
} from 'shared';
import type { Db } from '../catalog/catalog-access.js';
import { DatabaseService } from '../database/database.service.js';
import { loadBlockGroups } from './block-catalog.js';

// Каталог блоков карты для редактора карт (block-catalog.ts) — с логом и длительностью.
@Injectable()
export class BlockCatalogService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(BlockCatalogService.name)
    private readonly logger: PinoLogger,
  ) {}

  async groupsOf(
    ownerId: string,
    db: Db = this.databaseService.db,
  ): Promise<BlockGroupInfo[]> {
    const t0 = Date.now();
    try {
      const groups = await loadBlockGroups(db, ownerId);
      this.logger.debug(
        { durationMs: Date.now() - t0, ownerId, count: groups.length },
        'Block groups loaded for a map',
      );
      return groups;
    } catch (err) {
      this.logger.error({ err, ownerId }, 'Loading block groups failed');
      throw err;
    }
  }

  async catalogOf(ownerId: string, db?: Db): Promise<BlockCatalog> {
    return createBlockCatalog(await this.groupsOf(ownerId, db));
  }
}
