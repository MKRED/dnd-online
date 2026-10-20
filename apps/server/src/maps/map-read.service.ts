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
  summarizeObjects,
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
import { MapLimitsConfig } from './map-limits.js';
import { loadChunks } from './map-storage.js';
import { sizeOf } from './maps.mapper.js';
import {
  loadObjectsWithView,
  objectSliceText,
} from './objects/map-object-read.js';
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
    private readonly limits: MapLimitsConfig,
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
      const { objects, view } = await loadObjectsWithView(tx, ownerId, map);
      return {
        seq: map.seq,
        size: sizeOf(map),
        palette: map.palette,
        chunks,
        objects: [...objects.byId.values()],
        nextObjectId: objects.nextId,
        refs: view,
      };
    });
  }

  getSummary(ownerId: string, mapId: string): Promise<MapSummaryResponse> {
    return this.read(ownerId, mapId, 'summary', async (tx, map) => {
      const store = await loadChunks(tx, mapId, 'all');
      const summary = summarizeMap({ store, palette: map.palette });
      const { objects, view } = await loadObjectsWithView(tx, ownerId, map);
      const sized = { store, palette: map.palette, size: sizeOf(map) };
      return {
        seq: map.seq,
        size: sizeOf(map),
        maxHeight: this.limits.maxHeight,
        ...summary,
        chunkCount: [...store.keys()].length,
        palette: map.palette,
        objects: summarizeObjects(sized, objects.byId.values(), view),
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
      const region = sliceRegion(sliceRanges(query), sizeOf(map));
      const store = await loadChunks(
        tx,
        mapId,
        chunkKeysInBox({
          min: [region.minX, y, region.minZ],
          max: [region.maxX, y, region.maxZ],
        }),
      );
      const text = renderAsciiSlice({ store, palette: map.palette }, y, region);
      const lines = await objectSliceText(tx, ownerId, map, y, region);
      return { seq: map.seq, y, text: [text, ...lines].join('\n') };
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
      // Без высоты разрез идёт от земли до верхнего блока: высота у карты не хранится.
      let top: number | null = null;
      if (!ranges.height) {
        top = (await this.loadBounds(tx, map))?.max[1] ?? null;
        if (top === null) {
          return { seq: map.seq, axis, at, text: 'Карта пустая' };
        }
      }
      const region = sectionRegion(query, ranges, sizeOf(map), top);
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

  // Границы построенного — для разреза, у которого не задана высота.
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
