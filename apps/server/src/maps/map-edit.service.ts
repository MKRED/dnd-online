import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  emptyRefsView,
  MapOpError,
  parseMapOpBatch,
  unpackChangeset,
  type Changeset,
  type MapEditResult,
  type MapOp,
} from 'shared';
import {
  DatabaseService,
  type DbTransaction,
} from '../database/database.service.js';
import type { maps } from '../database/schema/index.js';
import { findOwnedMap } from './map-access.js';
import { isEmptyEdit, runOps, runReplay, type EditTarget } from './edit-run.js';
import {
  commitEdit,
  findRedoSource,
  findUndoTarget,
  setUndone,
} from './map-journal.js';
import { MapLimitsConfig } from './map-limits.js';
import { sizeOf } from './maps.mapper.js';
import {
  createdObjectIds,
  loadOpsRefs,
  loadTouchedRefsView,
  touchedRefsView,
} from './objects/map-object-edit.js';
import { mapStorage } from './storage/index.js';

type MapRow = typeof maps.$inferSelect;
type EditKind = 'op' | 'undo' | 'redo';

function target(map: MapRow): EditTarget {
  return {
    storage: mapStorage(map.id),
    palette: map.palette,
    size: sizeOf(map),
    nextObjectId: map.nextObjectId,
  };
}

// Изменение блоков карты: пачки операций, undo, redo. Каждая правка — одна транзакция
// под блокировкой строки карты (см. findOwnedMap).
@Injectable()
export class MapEditService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly limits: MapLimitsConfig,
    @InjectPinoLogger(MapEditService.name) private readonly logger: PinoLogger,
  ) {}

  applyBatch(ownerId: string, mapId: string, rawOps: unknown[]) {
    const ops = this.parse(rawOps);
    return this.edit(ownerId, mapId, 'op', async (tx, map) => {
      const run = await runOps(tx, target(map), ops, this.limits, (objects) =>
        loadOpsRefs(tx, ownerId, objects, ops),
      );
      // Ничего не изменилось — запись в журнал не нужна, seq не двигается. Номер
      // объекта, поставленного и убранного в этой же пачке, в журнал не попал, и его
      // можно выдать снова.
      if (isEmptyEdit(run.applied)) {
        return {
          seq: map.seq,
          changedCells: 0,
          conflicts: 0,
          paletteAdded: [],
          changes: { cells: [], paletteAdded: [] },
          createdObjectIds: [],
          refs: emptyRefsView(),
        };
      }
      const result = await commitEdit(tx, {
        ...this.commitBase(ownerId, map),
        run,
        entry: { kind: 'op', ops },
      });
      return {
        ...result,
        createdObjectIds: createdObjectIds(run.applied),
        refs: run.loaded
          ? touchedRefsView(run.loaded.view, run.applied)
          : emptyRefsView(),
      };
    });
  }

  undo(ownerId: string, mapId: string) {
    return this.edit(ownerId, mapId, 'undo', async (tx, map) => {
      const target = await findUndoTarget(tx, mapId);
      if (!target) throw new BadRequestException('Нечего отменять');
      const changeset = unpackChangeset(target.changeset);
      const result = await this.replay(tx, ownerId, map, changeset, {
        kind: 'undo',
        targetSeq: target.seq,
      });
      await setUndone(tx, mapId, target.seq, true);
      return result;
    });
  }

  // Redo — откат записи undo: возвращается ровно то, что она сняла, а её
  // клетки-конфликты так и остаются нетронутыми.
  redo(ownerId: string, mapId: string) {
    return this.edit(ownerId, mapId, 'redo', async (tx, map) => {
      const source = await findRedoSource(tx, mapId);
      if (!source?.targetSeq)
        throw new BadRequestException('Нечего возвращать');
      const changeset = unpackChangeset(source.changeset);
      const result = await this.replay(tx, ownerId, map, changeset, {
        kind: 'redo',
        targetSeq: source.targetSeq,
      });
      await setUndone(tx, mapId, source.targetSeq, false);
      return result;
    });
  }

  private async replay(
    tx: DbTransaction,
    ownerId: string,
    map: MapRow,
    changeset: Changeset,
    entry: { kind: 'undo' | 'redo'; targetSeq: number },
  ): Promise<MapEditResult> {
    // И undo, и redo откатывают запись журнала: undo — операцию, redo — отмену.
    const run = await runReplay(tx, target(map), changeset);
    // Запись пишется даже без изменений (всё в конфликтах): иначе флаг undone
    // разошёлся бы с журналом.
    const result = await commitEdit(tx, {
      ...this.commitBase(ownerId, map),
      run,
      entry,
    });
    return {
      ...result,
      conflicts: run.conflicts,
      createdObjectIds: [],
      refs: await loadTouchedRefsView(tx, ownerId, run.applied),
    };
  }

  private commitBase(ownerId: string, map: MapRow) {
    return {
      mapId: map.id,
      authorId: ownerId,
      currentSeq: map.seq,
      maxChunks: this.limits.maxChunks,
    };
  }

  private parse(rawOps: unknown[]): MapOp[] {
    try {
      return parseMapOpBatch(rawOps, this.limits);
    } catch (err) {
      if (err instanceof MapOpError) throw new BadRequestException(err.message);
      throw err;
    }
  }

  private async edit(
    ownerId: string,
    mapId: string,
    kind: EditKind,
    run: (tx: DbTransaction, map: MapRow) => Promise<MapEditResult>,
  ): Promise<MapEditResult> {
    const t0 = Date.now();
    try {
      const result = await this.databaseService.db.transaction(async (tx) => {
        const map = await findOwnedMap(tx, ownerId, mapId, { forUpdate: true });
        return run(tx, map);
      });
      this.logger.info(
        { durationMs: Date.now() - t0, ownerId, mapId, kind, ...result },
        'Map edited',
      );
      return result;
    } catch (err: unknown) {
      if (err instanceof MapOpError) throw new BadRequestException(err.message);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException
      ) {
        throw err;
      }
      this.logger.error({ err, ownerId, mapId, kind }, 'Map edit failed');
      throw err;
    }
  }
}
