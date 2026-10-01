import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  applyChangeset,
  applyOps,
  chunkKeysInBox,
  MapOpError,
  opRegion,
  parseMapOpBatch,
  type Changeset,
  type MapEditResult,
  type MapOp,
} from 'shared';
import {
  DatabaseService,
  type DbTransaction,
} from '../database/database.service.js';
import type { maps } from '../database/schema/index.js';
import { unpackChangeset } from './changeset-codec.js';
import { findOwnedMap } from './map-access.js';
import {
  chunkKeysOfChangeset,
  commitEdit,
  findRedoSource,
  findUndoTarget,
  setUndone,
} from './map-journal.js';
import { MapLimitsConfig } from './map-limits.js';
import { loadChunks } from './map-storage.js';

type MapRow = typeof maps.$inferSelect;
type EditKind = 'op' | 'undo' | 'redo';

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
      const keys = new Set(ops.flatMap((op) => chunkKeysInBox(opRegion(op))));
      const store = await loadChunks(tx, mapId, [...keys]);
      const loadedKeys = new Set(store.keys());
      const palette = [...map.palette];
      const applied = applyOps({ store, palette }, ops);
      // Ничего не изменилось — запись в журнал не нужна, seq не двигается.
      if (applied.cells.length === 0) {
        return {
          seq: map.seq,
          changedCells: 0,
          conflicts: 0,
          paletteAdded: [],
        };
      }
      return commitEdit(tx, {
        ...this.commitBase(ownerId, map),
        palette,
        store,
        loadedKeys,
        applied,
        entry: { kind: 'op', ops },
      });
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
    const store = await loadChunks(tx, map.id, [
      ...chunkKeysOfChangeset(changeset),
    ]);
    const loadedKeys = new Set(store.keys());
    const palette = [...map.palette];
    const { conflicts, applied } = applyChangeset(
      { store, palette },
      changeset,
      'backward',
    );
    // Запись пишется даже без изменений (всё в конфликтах): иначе флаг undone
    // разошёлся бы с журналом.
    const result = await commitEdit(tx, {
      ...this.commitBase(ownerId, map),
      palette,
      store,
      loadedKeys,
      applied,
      entry,
    });
    return { ...result, conflicts: conflicts.length };
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
