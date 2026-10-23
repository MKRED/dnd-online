import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { readBlockGroupOrigin, type BlockGroupOriginLink } from 'shared';
import {
  authoredEntry,
  rejectCatalogEdit,
  visibleEntry,
} from '../catalog/catalog-access.js';
import {
  DatabaseService,
  type DbTransaction,
} from '../database/database.service.js';
import { blockGroups, users } from '../database/schema/index.js';
import { blockGroupVersion } from './block-group-version.js';
import { BLOCK_GROUP_ACCESS } from './block-groups.config.js';
import { BlockGroupsService } from './block-groups.service.js';

type GroupRow = typeof blockGroups.$inferSelect;

// Вид и свойства оригинала для копии: всё, кроме ссылки самого оригинала на его
// собственный оригинал (копия копии ссылается на того, у кого скопировали).
function contentOf(source: GroupRow, origin: BlockGroupOriginLink) {
  return {
    category: source.category,
    details: source.details,
    extra: { ...source.extra, origin },
  };
}

const originOf = (
  source: GroupRow,
  authorNickname: string,
): BlockGroupOriginLink => ({
  id: source.id,
  name: source.name,
  authorNickname,
  version: blockGroupVersion(source),
});

// Копирование чужих групп блоков и «Подтянуть обновления» (docs/plan/blocks.md,
// этап 6б). Копия — обычная своя группа: её правят как угодно, а обновление заменяет
// её вид и свойства оригинальными.
@Injectable()
export class BlockGroupCopyService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly groups: BlockGroupsService,
    @InjectPinoLogger(BlockGroupCopyService.name)
    private readonly logger: PinoLogger,
  ) {}

  // Оригинал, видимый пользователю (свой или опубликованный), с ником автора.
  private async visibleSource(tx: DbTransaction, userId: string, id: string) {
    const [found] = await tx
      .select({ group: blockGroups, authorNickname: users.nickname })
      .from(blockGroups)
      .innerJoin(users, eq(users.id, blockGroups.authorId))
      .where(visibleEntry(BLOCK_GROUP_ACCESS, userId, id));
    return found;
  }

  async copy(userId: string, sourceId: string) {
    const t0 = Date.now();
    this.logger.info({ userId, sourceId }, 'Block group copy started');
    try {
      const id = await this.databaseService.db.transaction(async (tx) => {
        const found = await this.visibleSource(tx, userId, sourceId);
        if (!found) throw new NotFoundException(BLOCK_GROUP_ACCESS.notFound);
        const { group, authorNickname } = found;
        if (group.authorId === userId)
          throw new BadRequestException(
            'Это ваша группа блоков — копировать её не нужно',
          );
        const [inserted] = await tx
          .insert(blockGroups)
          .values({
            authorId: userId,
            name: group.name,
            description: group.description,
            sources: group.sources,
            isPublic: false,
            ...contentOf(group, originOf(group, authorNickname)),
          })
          .returning({ id: blockGroups.id });
        return inserted.id;
      });
      this.logger.info(
        { durationMs: Date.now() - t0, userId, sourceId, entryId: id },
        'Block group copied',
      );
      return this.groups.findOne(userId, id);
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, durationMs: Date.now() - t0, userId, sourceId },
        'Block group copy failed',
      );
      throw err;
    }
  }

  async pull(userId: string, id: string) {
    const t0 = Date.now();
    this.logger.info({ userId, entryId: id }, 'Block group pull started');
    try {
      await this.databaseService.db.transaction(async (tx) => {
        const [copy] = await tx
          .select()
          .from(blockGroups)
          .where(authoredEntry(BLOCK_GROUP_ACCESS, userId, id));
        if (!copy) return rejectCatalogEdit(tx, BLOCK_GROUP_ACCESS, userId, id);
        const link = readBlockGroupOrigin(copy.extra);
        if (!link)
          throw new BadRequestException(
            'Эта группа не копия — обновлять её не из чего',
          );
        const found = await this.visibleSource(tx, userId, link.id);
        if (!found)
          throw new ConflictException(
            'Оригинал недоступен: автор скрыл или удалил его',
          );
        const { group, authorNickname } = found;
        // Заменяются вид и свойства (решено с пользователем 2026-10-23); название,
        // описание, источники и публикация копии остаются её собственными.
        await tx
          .update(blockGroups)
          .set(contentOf(group, originOf(group, authorNickname)))
          .where(eq(blockGroups.id, id));
      });
      this.logger.info(
        { durationMs: Date.now() - t0, userId, entryId: id },
        'Block group pulled from origin',
      );
      return this.groups.findOne(userId, id);
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, durationMs: Date.now() - t0, userId, entryId: id },
        'Block group pull failed',
      );
      throw err;
    }
  }
}
