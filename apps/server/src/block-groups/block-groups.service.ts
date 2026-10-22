import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { BlockGroupFields } from 'shared';
import { CatalogEntriesService } from '../catalog/entries/catalog-entries.service.js';
import { DatabaseService } from '../database/database.service.js';
import { BLOCK_GROUPS_CONFIG } from './block-groups.config.js';
import type { BlockGroupDto } from './dto/block-group.dto.js';

// Удаление — общее: группа уходит, а её блоки на картах и сценах становятся пустотой,
// потому что каталог карты их больше не описывает (docs/plan/blocks.md, «Решения»).
@Injectable()
export class BlockGroupsService extends CatalogEntriesService<
  BlockGroupFields,
  BlockGroupDto
> {
  constructor(
    databaseService: DatabaseService,
    @InjectPinoLogger(BlockGroupsService.name) logger: PinoLogger,
  ) {
    super(databaseService, logger, BLOCK_GROUPS_CONFIG);
  }
}
