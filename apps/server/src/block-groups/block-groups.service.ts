import { Injectable } from '@nestjs/common';
import { inArray } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { CatalogEntryFields } from 'shared';
import { CatalogEntriesService } from '../catalog/entries/catalog-entries.service.js';
import { DatabaseService } from '../database/database.service.js';
import { blockGroups } from '../database/schema/index.js';
import {
  BLOCK_GROUPS_CONFIG,
  type BlockGroupVariant,
} from './block-groups.config.js';
import { blockGroupVersion } from './block-group-version.js';
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
  ) {
    super(database, log, BLOCK_GROUPS_CONFIG);
  }

  // У копий — виден ли оригинал тому, кто читает, и другие ли у него теперь вид и
  // свойства, чем взяты в копию (docs/plan/blocks.md, этап 6б). Скрытый или удалённый оригинал — «недоступен», сама
  // копия при этом не меняется.
  protected override attachLinks = async (
    userId: string,
    entries: (BlockGroupVariant & CatalogEntryFields)[],
  ): Promise<void> => {
    const copies = entries.filter((entry) => entry.origin);
    if (!copies.length) return;
    const t0 = Date.now();
    const ids = [...new Set(copies.map((entry) => entry.origin!.id))];
    const originals = await this.database.db
      .select({
        id: blockGroups.id,
        authorId: blockGroups.authorId,
        isPublic: blockGroups.isPublic,
        details: blockGroups.details,
        extra: blockGroups.extra,
      })
      .from(blockGroups)
      .where(inArray(blockGroups.id, ids));
    const byId = new Map(originals.map((row) => [row.id, row]));
    for (const entry of copies) {
      const origin = entry.origin!;
      const row = byId.get(origin.id);
      origin.available = Boolean(
        row && (row.isPublic || row.authorId === userId),
      );
      origin.updated =
        origin.available && blockGroupVersion(row!) !== origin.version;
    }
    this.log.debug(
      {
        durationMs: Date.now() - t0,
        copies: copies.length,
        found: originals.length,
      },
      'Block group origins attached',
    );
  };
}
