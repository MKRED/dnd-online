import { Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { BlockGroupUsage } from 'shared';
import { authoredEntry } from '../catalog/catalog-access.js';
import { DatabaseService } from '../database/database.service.js';
import {
  blockGroups,
  gameScenes,
  games,
  maps,
} from '../database/schema/index.js';
import { BLOCK_GROUP_ACCESS } from './block-groups.config.js';

// Палитра хранит имена форм группы: id группы для куба и «id_форма» для остальных
// (shared/customBlocks.ts), поэтому ищем по началу имени, а не по точному совпадению.
const usesGroup = (palette: AnyPgColumn, groupId: string) =>
  sql<boolean>`exists (select 1 from jsonb_array_elements_text(${palette}) as entry(name) where entry.name = ${groupId} or starts_with(entry.name, ${`${groupId}_`}))`;

@Injectable()
export class BlockGroupUsageService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(BlockGroupUsageService.name)
    private readonly logger: PinoLogger,
  ) {}

  // Карты и сцены автора, где стоят блоки группы. Блоки группы ставит только её автор,
  // поэтому чужие карты искать незачем.
  async usage(userId: string, groupId: string): Promise<BlockGroupUsage> {
    const t0 = Date.now();
    const { db } = this.databaseService;
    try {
      const [group] = await db
        .select({ id: blockGroups.id })
        .from(blockGroups)
        .where(authoredEntry(BLOCK_GROUP_ACCESS, userId, groupId))
        .limit(1);
      if (!group) throw new NotFoundException(BLOCK_GROUP_ACCESS.notFound);
      const usedMaps = await db
        .select({ id: maps.id, name: maps.name })
        .from(maps)
        .where(and(eq(maps.ownerId, userId), usesGroup(maps.palette, groupId)))
        .orderBy(maps.name);
      const scenes = await db
        .select({
          id: gameScenes.id,
          name: gameScenes.name,
          gameId: games.id,
          gameName: games.name,
        })
        .from(gameScenes)
        .innerJoin(games, eq(games.id, gameScenes.gameId))
        .where(
          and(
            eq(games.masterId, userId),
            isNull(gameScenes.archivedAt),
            usesGroup(gameScenes.palette, groupId),
          ),
        )
        .orderBy(games.name, gameScenes.name);
      this.logger.info(
        {
          durationMs: Date.now() - t0,
          userId,
          groupId,
          maps: usedMaps.length,
          scenes: scenes.length,
        },
        'Block group usage counted',
      );
      return { maps: usedMaps, scenes };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error({ err, userId, groupId }, 'Block group usage failed');
      throw err;
    }
  }
}
