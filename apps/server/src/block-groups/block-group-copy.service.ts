import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CatalogCopyService } from '../catalog/copies/catalog-copy.service.js';
import { DatabaseService } from '../database/database.service.js';
import { blockGroups } from '../database/schema/index.js';
import { BLOCK_GROUP_ACCESS } from './block-groups.config.js';
import { BlockGroupsService } from './block-groups.service.js';
import { BlockSceneNotifier } from './block-scene-notifier.service.js';

type Group = Awaited<ReturnType<BlockGroupsService['findOne']>>;

// Копирование чужих групп блоков и «Подтянуть обновления» (docs/plan/blocks.md,
// этап 6б) — на общем коде каталогов.
@Injectable()
export class BlockGroupCopyService extends CatalogCopyService<Group> {
  constructor(
    databaseService: DatabaseService,
    groups: BlockGroupsService,
    private readonly notifier: BlockSceneNotifier,
    @InjectPinoLogger(BlockGroupCopyService.name)
    logger: PinoLogger,
  ) {
    super(
      databaseService,
      logger,
      {
        catalog: 'blockGroup',
        table: blockGroups,
        access: BLOCK_GROUP_ACCESS,
        ownEntry: 'Это ваша группа блоков — копировать её не нужно',
        notCopy: 'Эта группа не копия — обновлять её не из чего',
      },
      (userId, id) => groups.findOne(userId, id),
    );
  }

  // Новый вид и свойства копии — сразу на сценах игр (этап 7).
  protected override afterPull = async (
    userId: string,
    id: string,
    group: Group,
  ) =>
    this.notifier.changed(
      userId,
      { id, name: group.name },
      false,
      await this.notifier.scenesUsing(userId, id),
    );
}
