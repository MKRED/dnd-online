import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  chunkKeysInBox,
  encodeChunk,
  mapBounds,
  parseChunkKey,
  renderAsciiSection,
  renderAsciiSlice,
  summarizeMap,
  type Box3,
  type MapChunksResponse,
  type MapSectionResponse,
  type MapSliceResponse,
  type MapSummaryResponse,
} from 'shared';
import {
  DatabaseService,
  type DbTransaction,
} from '../database/database.service.js';
import type { maps } from '../database/schema/index.js';
import { SectionQueryDto } from './dto/section-query.dto.js';
import { SliceQueryDto } from './dto/slice-query.dto.js';
import { findOwnedMap } from './map-access.js';
import { loadChunks } from './map-storage.js';
import {
  sectionBox,
  sectionRanges,
  sectionRegion,
  sliceRanges,
  sliceRegion,
} from './slice-region.js';

type MapRow = typeof maps.$inferSelect;

// Чтение блоков карты: для рендера (чанки), для нейросети (срез, разрез, сводка).
@Injectable()
export class MapReadService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(MapReadService.name) private readonly logger: PinoLogger,
  ) {}

  getChunks(ownerId: string, mapId: string): Promise<MapChunksResponse> {
    return this.read(ownerId, mapId, 'chunks', async (tx, map) => {
      const store = await loadChunks(tx, mapId, 'all');
      const chunks = [...store.keys()].map((key) => {
        const [cx, cy, cz] = parseChunkKey(key);
        const bytes = encodeChunk(store.get(key)!);
        return { cx, cy, cz, data: Buffer.from(bytes).toString('base64') };
      });
      return { seq: map.seq, palette: map.palette, chunks };
    });
  }

  getSummary(ownerId: string, mapId: string): Promise<MapSummaryResponse> {
    return this.read(ownerId, mapId, 'summary', async (tx, map) => {
      const store = await loadChunks(tx, mapId, 'all');
      const summary = summarizeMap({ store, palette: map.palette });
      return {
        seq: map.seq,
        ...summary,
        chunkCount: [...store.keys()].length,
        palette: map.palette,
      };
    });
  }

  getSlice(
    ownerId: string,
    mapId: string,
    query: SliceQueryDto,
  ): Promise<MapSliceResponse> {
    return this.read(ownerId, mapId, 'slice', async (tx, map) => {
      const { y } = query;
      const ranges = sliceRanges(query);
      let bounds: Box3 | null = null;
      if (!ranges.x) {
        bounds = await this.loadBounds(tx, map);
        if (!bounds) return { seq: map.seq, y, text: 'Карта пустая' };
      }
      const region = sliceRegion(ranges, bounds);
      const store = await loadChunks(
        tx,
        mapId,
        chunkKeysInBox({
          min: [region.minX, y, region.minZ],
          max: [region.maxX, y, region.maxZ],
        }),
      );
      const text = renderAsciiSlice({ store, palette: map.palette }, y, region);
      return { seq: map.seq, y, text };
    });
  }

  getSection(
    ownerId: string,
    mapId: string,
    query: SectionQueryDto,
  ): Promise<MapSectionResponse> {
    return this.read(ownerId, mapId, 'section', async (tx, map) => {
      const { axis, at } = query;
      const ranges = sectionRanges(query);
      let bounds: Box3 | null = null;
      if (!ranges.across || !ranges.height) {
        bounds = await this.loadBounds(tx, map);
        if (!bounds) return { seq: map.seq, axis, at, text: 'Карта пустая' };
      }
      const region = sectionRegion(query, ranges, bounds);
      const store = await loadChunks(
        tx,
        mapId,
        chunkKeysInBox(sectionBox(query, region)),
      );
      const text = renderAsciiSection(
        { store, palette: map.palette },
        axis,
        at,
        region,
      );
      return { seq: map.seq, axis, at, text };
    });
  }

  // Границы всей карты — для срезов, у которых прямоугольник не задан.
  private async loadBounds(tx: DbTransaction, map: MapRow) {
    const store = await loadChunks(tx, map.id, 'all');
    return mapBounds(store);
  }

  // Строка карты и чанки читаются одним снимком (REPEATABLE READ): иначе правка,
  // закоммиченная между запросами, дала бы чанки с id, которых нет в прочитанной палитре.
  private async read<T>(
    ownerId: string,
    mapId: string,
    what: string,
    run: (tx: DbTransaction, map: MapRow) => Promise<T>,
  ): Promise<T> {
    const t0 = Date.now();
    try {
      const result = await this.databaseService.db.transaction(
        async (tx) => {
          const map = await findOwnedMap(tx, ownerId, mapId, {
            forUpdate: false,
          });
          return run(tx, map);
        },
        { isolationLevel: 'repeatable read', accessMode: 'read only' },
      );
      this.logger.debug(
        { durationMs: Date.now() - t0, mapId, what },
        'Map read',
      );
      return result;
    } catch (err: unknown) {
      if (
        err instanceof NotFoundException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }
      this.logger.error({ err, ownerId, mapId, what }, 'Map read failed');
      throw err;
    }
  }
}
