import { Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { GameSceneRef } from 'shared';
import { DatabaseService } from '../database/database.service.js';
import { gameScenes, games } from '../database/schema/index.js';
import { appendGameEvent } from '../games/game-journal.js';
import { GameRealtimeService } from '../games/realtime/game-realtime.service.js';
import { usesGroup } from './block-group-palette.js';

// Действующие сцены игр мастера, где стоят блоки группы, — по играм.
export type GroupScenes = Map<string, GameSceneRef[]>;

// Правка своей группы блоков сразу доходит до сцен игр мастера (docs/plan/blocks.md,
// этап 7): в журнал каждой такой игры — запись blocks.changed. Журнал сам пересчитывает
// туман (обзор блока мог стать другим, удалённый блок — пустотой) и рассылает запись;
// клиенты перечитывают сцену с новыми описаниями блоков. Сцена не копирует блоки,
// поэтому правка видна в игре и без этой записи — запись нужна, чтобы её увидели сразу.
@Injectable()
export class BlockSceneNotifier {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly realtime: GameRealtimeService,
    @InjectPinoLogger(BlockSceneNotifier.name)
    private readonly logger: PinoLogger,
  ) {}

  async scenesUsing(userId: string, groupId: string): Promise<GroupScenes> {
    const rows = await this.databaseService.db
      .select({
        gameId: gameScenes.gameId,
        id: gameScenes.id,
        name: gameScenes.name,
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
      .orderBy(gameScenes.name);
    const byGame: GroupScenes = new Map();
    for (const { gameId, id, name } of rows) {
      byGame.set(gameId, [...(byGame.get(gameId) ?? []), { id, name }]);
    }
    return byGame;
  }

  // Ошибка записи в журнал правку группы не отменяет — она уже сохранена; игрок увидит
  // её при следующем чтении сцены. Поэтому ошибка только пишется в лог.
  async changed(
    userId: string,
    group: { id: string; name: string },
    deleted: boolean,
    scenes: GroupScenes,
  ): Promise<void> {
    for (const [gameId, gameScenesList] of scenes) {
      const t0 = Date.now();
      try {
        const seq = await this.databaseService.db.transaction((tx) =>
          appendGameEvent(tx, gameId, {
            kind: 'blocks.changed',
            actorId: userId,
            // Блоки сцены — записи справочника мастера: правит их мастер игры.
            as: { kind: 'master' },
            intent: { groupId: group.id },
            result: { group, deleted, scenes: gameScenesList },
          }),
        );
        this.realtime.publish(gameId);
        this.logger.info(
          {
            durationMs: Date.now() - t0,
            userId,
            gameId,
            groupId: group.id,
            deleted,
            seq,
          },
          'Block group change sent to game',
        );
      } catch (err: unknown) {
        this.logger.error(
          { err, userId, gameId, groupId: group.id },
          'Block group change was not sent to game',
        );
      }
    }
  }
}
