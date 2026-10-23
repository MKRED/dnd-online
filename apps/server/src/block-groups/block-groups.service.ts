import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { CatalogEntryFields } from 'shared';
import { attachOrigins } from '../catalog/copies/catalog-origins.js';
import { CatalogEntriesService } from '../catalog/entries/catalog-entries.service.js';
import type { CatalogWriteOptions } from '../catalog/token-publication.js';
import { DatabaseService } from '../database/database.service.js';
import { blockGroups } from '../database/schema/index.js';
import {
  BLOCK_GROUPS_CONFIG,
  type BlockGroupVariant,
} from './block-groups.config.js';
import { BlockSceneNotifier } from './block-scene-notifier.service.js';
import type { BlockGroupDto } from './dto/block-group.dto.js';

// Удаление — общее: группа уходит, а её блоки на картах и сценах становятся пустотой,
// потому что каталог карты их больше не описывает (docs/plan/blocks.md, «Решения»).
@Injectable()
export class BlockGroupsService extends CatalogEntriesService<
  BlockGroupVariant,
  BlockGroupDto
> {
  constructor(
    private readonly database: DatabaseService,
    @InjectPinoLogger(BlockGroupsService.name)
    private readonly log: PinoLogger,
    private readonly notifier: BlockSceneNotifier,
  ) {
    super(database, log, BLOCK_GROUPS_CONFIG);
  }

  // Правка группы сразу доходит до сцен игр мастера (docs/plan/blocks.md, этап 7).
  override async replace(
    userId: string,
    id: string,
    dto: BlockGroupDto,
    options: CatalogWriteOptions = {},
  ) {
    const group = await super.replace(userId, id, dto, options);
    await this.notifier.changed(
      userId,
      { id, name: group.name },
      false,
      await this.notifier.scenesUsing(userId, id),
    );
    return group;
  }

  // Сцены, где стоят блоки, ищем до удаления: после него группы не будет, а имена в
  // палитрах останутся, и удалённые блоки на сценах станут пустотой.
  override async remove(userId: string, id: string): Promise<void> {
    const scenes = await this.notifier.scenesUsing(userId, id);
    const [group] = scenes.size
      ? await this.database.db
          .select({ name: blockGroups.name })
          .from(blockGroups)
          .where(eq(blockGroups.id, id))
      : [];
    await super.remove(userId, id);
    if (group)
      await this.notifier.changed(
        userId,
        { id, name: group.name },
        true,
        scenes,
      );
  }

  // Ссылка копии на оригинал: виден ли он и обновлялся ли (этап 6б).
  protected override attachLinks = (
    userId: string,
    entries: (BlockGroupVariant & CatalogEntryFields)[],
  ) => attachOrigins(this.database, blockGroups, this.log, userId, entries);
}
